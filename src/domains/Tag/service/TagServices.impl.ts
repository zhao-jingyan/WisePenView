import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import type {
  GetGroupResourceRequest,
  IResourceService,
  ResourceListPage,
} from '@/domains/Resource';
import { ResourceTagApi } from '@/domains/Resource/apis/ResourceApi';
import type { TagListByTagResponse } from '@/domains/Tag';
import { useTrashTagStore } from '@/store';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import { TagServicesMap } from '../mapper/TagServices.map';
import type {
  GetResByTagRequest,
  ITagService,
  TagCreateRequest,
  TagDeleteRequest,
  TagMoveRequest,
  TagTreeNode,
  TagTreeResponse,
  TagUpdateRequest,
} from './index.type';
import {
  buildTagFlatMap,
  buildTaggedResourceListRequest,
  filterTagTreeForView,
  TAG_CACHE_KEY_DEFAULT,
} from './TagServices.helper';

const TRASH_FOLDER_NAME = '.Trash';

const syncTrashTagIdToStore = (groupId: string | undefined, roots: TagTreeResponse[]): void => {
  const queue: TagTreeResponse[] = [];
  for (const root of roots) {
    queue.push(root);
  }
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.tagName === TRASH_FOLDER_NAME) {
      useTrashTagStore.getState().setTrashTagId(groupId, node.tagId);
      return;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        queue.push(child);
      }
    }
  }
  useTrashTagStore.getState().setTrashTagId(groupId, undefined);
};

export interface TagServicesDeps {
  resourceService: IResourceService;
}

export const createTagServices = (deps: TagServicesDeps): ITagService => {
  const { resourceService } = deps;

  /** 按 groupId 存储已拉取的原始标签树；写操作后通过 clearTagTreeCache 清除 */
  const rawTagTreeCache = new Map<string, TagTreeNode[]>();
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 rawTagTreeCache 同步维护 */
  const rawTagFlatCache = new Map<string, Map<string, TagTreeNode>>();
  /** 按 groupId 存储已拉取的过滤后标签树；写操作后通过 clearTagTreeCache 清除 */
  const tagTreeCache = new Map<string, TagTreeNode[]>();
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 tagTreeCache 同步维护 */
  const tagFlatCache = new Map<string, Map<string, TagTreeNode>>();

  const clearTagTreeCache = (groupId?: string): void => {
    if (groupId !== undefined) {
      const cacheKey = normalizeTagGroupId(groupId) ?? TAG_CACHE_KEY_DEFAULT;
      rawTagTreeCache.delete(cacheKey);
      rawTagFlatCache.delete(cacheKey);
      tagTreeCache.delete(cacheKey);
      tagFlatCache.delete(cacheKey);
    } else {
      rawTagTreeCache.clear();
      rawTagFlatCache.clear();
      tagTreeCache.clear();
      tagFlatCache.clear();
    }
  };

  registerServiceCacheCleaner(() => clearTagTreeCache());

  const getRawTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? TAG_CACHE_KEY_DEFAULT;
    const cached = rawTagTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const params = TagServicesMap.mapGetTagTreeRequest(normalizedGroupId);
    const data = await ResourceTagApi.getTagTree(params);
    const roots = TagServicesMap.mapTagTreeFromApi(data);
    syncTrashTagIdToStore(normalizedGroupId, roots);
    rawTagTreeCache.set(cacheKey, roots);
    rawTagFlatCache.set(cacheKey, buildTagFlatMap(roots));
    return roots;
  };

  const getRawTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? TAG_CACHE_KEY_DEFAULT;
    return rawTagFlatCache.get(cacheKey)?.get(tagId);
  };

  const getTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const cacheKey = normalizedGroupId ?? TAG_CACHE_KEY_DEFAULT;
    const cached = tagTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const rawRoots = await getRawTagTree(normalizedGroupId);
    // 剥离路径型（folder）与系统保留前缀（`.` 开头）
    const roots = filterTagTreeForView(rawRoots);
    tagTreeCache.set(cacheKey, roots);
    tagFlatCache.set(cacheKey, buildTagFlatMap(roots));
    return roots;
  };

  const getTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? TAG_CACHE_KEY_DEFAULT;
    return tagFlatCache.get(cacheKey)?.get(tagId);
  };

  const updateTag = async (params: TagUpdateRequest): Promise<void> => {
    const payload = TagServicesMap.mapUpdateTagRequest(params);
    await ResourceTagApi.changeTag(payload);
    clearTagTreeCache(params.groupId);
  };

  const addTag = async (params: TagCreateRequest): Promise<string> => {
    const payload = TagServicesMap.mapAddTagRequest(params);
    const data = await ResourceTagApi.addTag(payload);
    clearTagTreeCache(params.groupId);
    return TagServicesMap.mapAddTagFromApi(data);
  };

  const deleteTag = async (params: TagDeleteRequest): Promise<void> => {
    await ResourceTagApi.removeTag(params);
    clearTagTreeCache(params.groupId);
  };

  const getResByTag = async (params: GetResByTagRequest): Promise<TagListByTagResponse> => {
    const targetTag = params.tag;
    await getTagTree(targetTag.groupId);
    const tag = getTagById(targetTag.tagId, targetTag.groupId);
    // 缓存未命中时维持旧行为空目录；字段完整性由 mapper 负责。
    let tags: TagTreeNode[] = [];
    if (tag) {
      tags = tag.children;
    }
    const filePage = params.filePage ?? 1;
    const filePageSize = params.filePageSize ?? 20;
    const listParams = buildTaggedResourceListRequest(targetTag.tagId, filePage, filePageSize);
    const normalizedGroupId = normalizeTagGroupId(targetTag.groupId);
    let res: ResourceListPage;
    if (normalizedGroupId) {
      const groupListParams: GetGroupResourceRequest = {
        page: listParams.page,
        size: listParams.size,
        sortBy: listParams.sortBy,
        sortDir: listParams.sortDir,
        tagIds: listParams.tagIds,
        tagQueryLogicMode: listParams.tagQueryLogicMode,
        groupId: normalizedGroupId,
      };
      res = await resourceService.getGroupResources(groupListParams);
    } else {
      res = await resourceService.getUserResources(listParams);
    }

    return { tags, files: res.list, totalFiles: res.total };
  };

  const moveTag = async (params: TagMoveRequest): Promise<void> => {
    await ResourceTagApi.moveTag(params);
    clearTagTreeCache(params.groupId);
  };

  return {
    getRawTagTree,
    getRawTagById,
    getTagTree,
    getTagById,
    getResByTag,
    updateTag,
    addTag,
    deleteTag,
    moveTag,
  };
};
