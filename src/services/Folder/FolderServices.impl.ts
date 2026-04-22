import type { ApiResponse } from '@/types/api';
import type { ResourceItem } from '@/types/resource';
import type { Folder, FolderListByPathResponse } from '@/types/folder';
import { mapTagToFolder } from '@/types/folder';
import type { TagTreeResponse } from '@/services/Tag/index.type';
import Axios from '@/utils/Axios';
import { normalizeTagGroupId } from '@/utils/normalizeTagGroupId';
import { checkResponse } from '@/utils/response';
import type { IResourceService } from '@/services/Resource/index.type';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import { useTrashTagStore } from '@/store';
import { registerServiceCacheCleaner } from '@/services/cacheRegistry';
import type { IFolderService, GetResByFolderRequest, GetFolderTreeRequest } from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
/** 回收站节点名：与 `/` 同级的根节点之一，由 Folder 域负责识别与维护 */
const TRASH_FOLDER_NAME = '.Trash';

/** 在原始 tag 树中查找 `.Trash` 节点，并将其 tagId 同步到 trash store */
const syncTrashTagIdToStore = (groupId: string | undefined, roots: TagTreeResponse[]): void => {
  const queue: TagTreeResponse[] = [...roots];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      continue;
    }
    if (node.tagName === TRASH_FOLDER_NAME) {
      useTrashTagStore.getState().setTrashTagId(groupId, node.tagId);
      return;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      queue.push(...node.children);
    }
  }
  useTrashTagStore.getState().setTrashTagId(groupId, undefined);
};

const buildFlatMap = (root: Folder): Map<string, Folder> => {
  const map = new Map<string, Folder>();
  const walk = (f: Folder) => {
    map.set(f.tagId, f);
    (f.children ?? []).forEach(walk);
  };
  walk(root);
  return map;
};

export interface FolderServicesDeps {
  resourceService: IResourceService;
}

export const createFolderServices = (deps: FolderServicesDeps): IFolderService => {
  const { resourceService } = deps;

  /** 按 groupId 存储已拉取的文件夹树；写操作后通过 clearFolderTreeCache 清除 */
  const folderTreeCache = new Map<string, Folder>();
  /** 扁平索引：cacheKey → (tagId → Folder)，与 folderTreeCache 同步维护 */
  const folderFlatCache = new Map<string, Map<string, Folder>>();

  const clearFolderTreeCache = (groupId?: string): void => {
    if (groupId !== undefined) {
      const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
      folderTreeCache.delete(cacheKey);
      folderFlatCache.delete(cacheKey);
    } else {
      folderTreeCache.clear();
      folderFlatCache.clear();
    }
  };

  registerServiceCacheCleaner(() => clearFolderTreeCache());

  const getFolderTree = async (params: GetFolderTreeRequest = {}): Promise<Folder> => {
    const normalizedGroupId = normalizeTagGroupId(params.groupId);
    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = folderTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const res = (await Axios.get('/resource/tag/getTagTree', {
      params: normalizedGroupId ? { groupId: normalizedGroupId } : undefined,
    })) as ApiResponse<TagTreeResponse[]>;
    checkResponse(res);
    const tags = res.data ?? [];
    // `.Trash` 与 `/` 同级，属于 Folder 域；拉树时顺带同步 trashTagId
    syncTrashTagIdToStore(normalizedGroupId, tags);
    const rootTag = tags.find((t) => t.tagName === '/');
    if (!rootTag) {
      throw new Error('未能加载根文件夹');
    }
    const root = mapTagToFolder(rootTag) as Folder;
    folderTreeCache.set(cacheKey, root);
    folderFlatCache.set(cacheKey, buildFlatMap(root));
    return root;
  };

  const getFolderById = (tagId: string, groupId?: string): Folder | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    return folderFlatCache.get(cacheKey)?.get(tagId);
  };

  // 返回一个节点下的所有子节点和文件
  const getResByFolder = async (
    params: GetResByFolderRequest
  ): Promise<FolderListByPathResponse> => {
    const targetFolder = params.folder;
    await getFolderTree({ groupId: targetFolder.groupId });
    const folder = getFolderById(targetFolder.tagId, targetFolder.groupId);
    const folders = folder?.children ?? [];
    const filePage = params.filePage ?? 1;
    const filePageSize = params.filePageSize ?? 20;
    const tagId = targetFolder.tagId;

    let files: ResourceItem[] = [];
    let totalFiles = 0;

    const listParams = {
      page: filePage,
      size: filePageSize,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [tagId],
      tagQueryLogicMode: 'AND' as const,
    };
    const normalizedGroupId = normalizeTagGroupId(targetFolder.groupId);
    const res = normalizedGroupId
      ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
      : await resourceService.getUserResources(listParams);

    files = res.list;
    totalFiles = res.total;

    return { folders, files, totalFiles };
  };

  const renameFolder = async (folder: Folder, newName: string): Promise<void> => {
    const newPathName = '/' + newName;
    const res = (await Axios.post('/resource/tag/changeTag', {
      targetTagId: folder.tagId,
      tagName: newPathName,
    })) as ApiResponse;
    checkResponse(res);
    clearFolderTreeCache(folder.groupId);
  };

  const deleteFolder = async (folder: Folder): Promise<void> => {
    let trashTagId = useTrashTagStore.getState().getTrashTagId(folder.groupId);
    if (!trashTagId) {
      // trash store 未填充时拉一次本域 folder 树，顺带同步 trashTagId
      await getFolderTree({ groupId: folder.groupId });
      trashTagId = useTrashTagStore.getState().getTrashTagId(folder.groupId);
    }
    if (!trashTagId) {
      throw new Error('未找到回收站标签，无法删除文件夹');
    }

    const res = (await Axios.post('/resource/tag/moveTag', {
      targetTagId: folder.tagId,
      newParentId: trashTagId,
    })) as ApiResponse;
    checkResponse(res);
    clearFolderTreeCache(folder.groupId);
  };

  const createFolder = async (parentFolder: Folder, folderName: string): Promise<void> => {
    const newPathName = `/${folderName}`;
    const res = (await Axios.post('/resource/tag/addTag', {
      parentId: parentFolder.tagId,
      tagName: newPathName,
    })) as ApiResponse;
    checkResponse(res);
    clearFolderTreeCache();
  };

  const moveFolderToFolder = async (folder: Folder, newParentFolder: Folder): Promise<void> => {
    // 遍历 newParentFolder 的父链，防止循环移动
    let current: Folder | undefined = newParentFolder;
    while (current) {
      if (current.tagId === folder.tagId) {
        throw new Error('不能将文件夹移动到自身或其子目录下');
      }
      // folder.groupId 可选，不一定有，所以调用 getFolderById 时带 groupId
      if (!current.parentId) break;
      current = getFolderById(current.parentId, current.groupId);
    }
    const res = (await Axios.post('/resource/tag/moveTag', {
      targetTagId: folder.tagId,
      newParentId: newParentFolder.tagId,
    })) as ApiResponse;
    checkResponse(res);
    clearFolderTreeCache();
  };

  const moveResourceToFolder = async (
    folder: Folder,
    resourceItem: ResourceItem
  ): Promise<void> => {
    const currentTags = resourceItem.currentTags ?? {};
    // 过滤出非文件夹标签，保留
    const nonFolderTagIds = Object.entries(currentTags)
      .filter(([, tagName]) => !tagName.startsWith('/'))
      .map(([tagId]) => tagId);
    // 构造新的标签列表
    const newTagIds = [...nonFolderTagIds, folder.tagId];

    await resourceService.updateResourceTags({
      resourceId: resourceItem.resourceId,
      tagIds: newTagIds,
    });
    clearFolderTreeCache();
  };

  return {
    getFolderTree,
    getFolderById,
    getResByFolder,
    renameFolder,
    deleteFolder,
    createFolder,
    moveFolderToFolder,
    moveResourceToFolder,
  };
};
