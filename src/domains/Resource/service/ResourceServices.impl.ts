import { DocumentApi } from '@/domains/Document/apis/DocumentApi';
import { NoteApi } from '@/domains/Note/apis/NoteApi';
import {
  useNewNoteStore,
  useNoteSelectionStore,
  usePdfPreviewProgressStore,
  useResourceDisplayNameStore,
} from '@/store';
import { ResourceInteractApi } from '../apis/InteractApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import type { ResourceItem } from '../entity/resource';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import {
  buildGroupMountResourceRequest,
  buildGroupResourceScanRequest,
  GROUP_RESOURCE_SCAN_PAGE_SIZE,
  resolveGroupMountTags,
  uniqueNonEmptyIds,
} from './ResourceServices.helper';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  InteractRateRequest,
  InteractToggleLikeRequest,
  IResourceService,
  MountResourcesToGroupTagRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceInteractStats,
  ResourceListPage,
  SearchQueryRequest,
  SearchResultPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourceTagsRequest,
} from './index.type';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
): Promise<ResourceListPage> => {
  const query = ResourceServicesMap.mapListResourceItemsRequest(params, queryOverrides);
  const data = await ResourceItemApi.listResources(query);
  return ResourceServicesMap.mapResourceListPageFromApi(data, { groupId: query.groupId });
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params, { groupId: params.groupId });
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  await ResourceItemApi.renameResource(params);
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
};

const removeResources = async (params: RemoveResourcesRequest): Promise<void> => {
  await ResourceItemApi.removeResources(params);
  for (const resourceId of params.resourceIds) {
    // 资源已删除，同步清理与之绑定的临时状态
    usePdfPreviewProgressStore.getState().removeProgress(resourceId);
    useNewNoteStore.getState().clearNewNoteResourceId(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  await ResourceItemApi.changeResourceTags(params);
};

const fetchGroupResourceItemsById = async (
  groupId: string,
  resourceIds: string[]
): Promise<Map<string, ResourceItem>> => {
  const pendingIds = new Set(resourceIds);
  const matchedItems = new Map<string, ResourceItem>();
  let page = 1;

  while (pendingIds.size > 0) {
    const request = buildGroupResourceScanRequest(groupId, page);
    const result = await getGroupResources(request);

    for (const item of result.list) {
      if (!pendingIds.has(item.resourceId)) continue;
      matchedItems.set(item.resourceId, item);
      pendingIds.delete(item.resourceId);
    }

    const reachedKnownTotal =
      result.total > 0 && page * GROUP_RESOURCE_SCAN_PAGE_SIZE >= result.total;
    const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
    const reachedShortPage = result.list.length < GROUP_RESOURCE_SCAN_PAGE_SIZE;
    if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) break;
    page += 1;
  }

  return matchedItems;
};

const mountResourcesToGroupTag = async (params: MountResourcesToGroupTagRequest): Promise<void> => {
  const resourceIds = uniqueNonEmptyIds(params.resourceIds);
  const targetTagId = params.tagId.trim();
  if (resourceIds.length === 0 || !targetTagId) return;

  const existingItems = await fetchGroupResourceItemsById(params.groupId, resourceIds);
  const updateTasks: Array<Promise<void>> = [];
  for (const resourceId of resourceIds) {
    const tagPayload = resolveGroupMountTags(existingItems.get(resourceId), targetTagId);
    const request = buildGroupMountResourceRequest(resourceId, params.groupId, tagPayload);
    updateTasks.push(updateResourceTags(request));
  }
  await Promise.all(updateTasks);
};

const updateResourceActionPermission = async (
  params: UpdateResourceActionPermissionRequest
): Promise<void> => {
  const request = ResourceServicesMap.mapChangeResourceActionPermissionRequest(params);
  await ResourceItemApi.changeResourceActionPermission(request);
};

/** 获取当前用户点赞状态，供点赞组件薄层调用 */
const getLikeStatus = async (resourceId: string): Promise<{ liked: boolean }> => {
  const res = await ResourceInteractApi.getUserInteractionRecord({ resourceId });
  return ResourceServicesMap.mapLikeStatusFromApi(res);
};

/** 获取当前用户评分，供评分组件薄层调用 */
const getRate = async (resourceId: string): Promise<{ score: number }> => {
  const res = await ResourceInteractApi.getUserInteractionRecord({ resourceId });
  return ResourceServicesMap.mapRateFromApi(res);
};

/** 点赞 / 取消点赞 */
const interactToggleLike = async (params: InteractToggleLikeRequest): Promise<void> => {
  await ResourceInteractApi.toggleLike({ resourceId: params.resourceId });
};

/** 评分（1–5），支持覆盖 */
const interactRate = async (params: InteractRateRequest): Promise<void> => {
  await ResourceInteractApi.rate({ resourceId: params.resourceId, score: params.score });
};

/** 上报资源阅读 */
const interactRead = async (resourceId: string): Promise<void> => {
  await ResourceInteractApi.read({ resourceId });
};

/** 获取资源聚合互动统计，供互动统计组件自行请求；编排 note 和 document 两个接口 */
const getInteractStats = async (resourceId: string): Promise<ResourceInteractStats> => {
  try {
    const data = await NoteApi.getNoteInfo({ resourceId });
    return ResourceServicesMap.mapInteractStatsFromApi(data.resourceInfo);
  } catch {
    const data = await DocumentApi.getDocInfo({ resourceId });
    return ResourceServicesMap.mapInteractStatsFromApi(data.resourceInfo);
  }
};

const globalSearch = async (params: SearchQueryRequest): Promise<SearchResultPage> => {
  const data = await ResourceItemApi.globalSearch(params);
  return ResourceServicesMap.mapSearchResultPageFromApi(data);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  updateResourceTags,
  mountResourcesToGroupTag,
  updateResourceActionPermission,
  getLikeStatus,
  getRate,
  interactToggleLike,
  interactRate,
  interactRead,
  getInteractStats,
  globalSearch,
});
