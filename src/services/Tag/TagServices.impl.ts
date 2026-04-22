import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { normalizeTagGroupId } from '@/utils/normalizeTagGroupId';
import { checkResponse } from '@/utils/response';
import type { IResourceService } from '@/services/Resource/index.type';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import { registerServiceCacheCleaner } from '@/services/cacheRegistry';
import type { TagListByTagResponse } from '@/types/tag';
import type {
  TagTreeResponse,
  TagTreeNode,
  TagCreateRequest,
  TagUpdateRequest,
  TagDeleteRequest,
  TagMoveRequest,
  GetResByTagRequest,
  ITagService,
} from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
/** 系统保留前缀：以 `.` 开头的 tag（如 `.Trash`）对 Tag 视图不可见 */
const HIDDEN_TAG_PREFIX = '.';

const buildFlatMap = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();
  const walk = (node: TagTreeNode) => {
    map.set(node.tagId, node);
    (node.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return map;
};

const filterHiddenTags = (nodes: TagTreeNode[]): TagTreeNode[] => {
  const filtered: TagTreeNode[] = [];
  for (const node of nodes) {
    if ((node.tagName ?? '').trim().startsWith(HIDDEN_TAG_PREFIX)) {
      continue;
    }
    filtered.push({
      ...node,
      children: Array.isArray(node.children) ? filterHiddenTags(node.children) : undefined,
    });
  }
  return filtered;
};

export interface TagServicesDeps {
  resourceService: IResourceService;
}

export const createTagServices = (deps: TagServicesDeps): ITagService => {
  const { resourceService } = deps;

  /** 按 groupId 存储已拉取的标签树；写操作后通过 clearTagTreeCache 清除 */
  const tagTreeCache = new Map<string, TagTreeNode[]>();
  /** 扁平索引：cacheKey → (tagId → TagTreeNode)，与 tagTreeCache 同步维护 */
  const tagFlatCache = new Map<string, Map<string, TagTreeNode>>();

  const clearTagTreeCache = (groupId?: string): void => {
    if (groupId !== undefined) {
      const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
      tagTreeCache.delete(cacheKey);
      tagFlatCache.delete(cacheKey);
    } else {
      tagTreeCache.clear();
      tagFlatCache.clear();
    }
  };

  registerServiceCacheCleaner(() => clearTagTreeCache());

  const getTagTree = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalizedGroupId = normalizeTagGroupId(groupId);

    const cacheKey = normalizedGroupId ?? CACHE_KEY_DEFAULT;
    const cached = tagTreeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const params = normalizedGroupId ? { groupId: normalizedGroupId } : undefined;
    const res = (await Axios.get('/resource/tag/getTagTree', { params })) as ApiResponse<
      TagTreeResponse[]
    >;
    checkResponse(res);
    // 剥离路径型（folder）与系统保留前缀（`.` 开头）
    const nonFolderRoots: TagTreeNode[] = (res.data ?? []).filter(
      (item) => !(item.tagName && item.tagName.startsWith('/'))
    );
    const roots: TagTreeNode[] = filterHiddenTags(nonFolderRoots);
    tagTreeCache.set(cacheKey, roots);
    tagFlatCache.set(cacheKey, buildFlatMap(roots));
    return roots;
  };

  const getTagById = (tagId: string, groupId?: string): TagTreeNode | undefined => {
    const cacheKey = normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
    return tagFlatCache.get(cacheKey)?.get(tagId);
  };

  const updateTag = async (params: TagUpdateRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/changeTag', params)) as ApiResponse;
    checkResponse(res);
    clearTagTreeCache(params.groupId);
  };

  const addTag = async (params: TagCreateRequest): Promise<string> => {
    const res = (await Axios.post('/resource/tag/addTag', params)) as ApiResponse<string>;
    checkResponse(res);
    clearTagTreeCache(params.groupId);
    return res.data ?? '';
  };

  const deleteTag = async (params: TagDeleteRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/removeTag', params)) as ApiResponse;
    checkResponse(res);
    clearTagTreeCache(params.groupId);
  };

  const getResByTag = async (params: GetResByTagRequest): Promise<TagListByTagResponse> => {
    const targetTag = params.tag;
    await getTagTree(targetTag.groupId);
    const tag = getTagById(targetTag.tagId, targetTag.groupId);
    const tags = tag?.children ?? [];
    const filePage = params.filePage ?? 1;
    const filePageSize = params.filePageSize ?? 20;
    const listParams = {
      page: filePage,
      size: filePageSize,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [targetTag.tagId],
      tagQueryLogicMode: 'AND' as const,
    };
    const normalizedGroupId = normalizeTagGroupId(targetTag.groupId);
    const res = normalizedGroupId
      ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
      : await resourceService.getUserResources(listParams);

    return { tags, files: res.list, totalFiles: res.total };
  };

  const moveTag = async (params: TagMoveRequest): Promise<void> => {
    const res = (await Axios.post('/resource/tag/moveTag', params)) as ApiResponse;
    checkResponse(res);
    clearTagTreeCache(params.groupId);
  };

  return {
    getTagTree,
    getTagById,
    getResByTag,
    updateTag,
    addTag,
    deleteTag,
    moveTag,
  };
};
