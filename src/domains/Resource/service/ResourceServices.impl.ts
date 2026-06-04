import {
  useNewNoteStore,
  useNoteSelectionStore,
  usePdfPreviewProgressStore,
  useResourceDisplayNameStore,
} from '@/store';
import { ResourceInteractApi } from '../apis/InteractApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  InteractRateRequest,
  InteractRateResult,
  InteractToggleLikeRequest,
  InteractToggleLikeResult,
  IResourceService,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceListPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourceTagsRequest,
} from './index.type';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
): Promise<ResourceListPage> => {
  const query = ResourceServicesMap.mapListResourceItemsRequest(params, queryOverrides);
  const data = await ResourceItemApi.listResources(query);
  return ResourceServicesMap.mapResourceListPageFromApi(data);
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

const updateResourceActionPermission = async (
  params: UpdateResourceActionPermissionRequest
): Promise<void> => {
  const request = ResourceServicesMap.mapChangeResourceActionPermissionRequest(params);
  await ResourceItemApi.changeResourceActionPermission(request);
};

/** 点赞 / 取消点赞，返回操作后最新状态 */
const interactToggleLike = async (
  params: InteractToggleLikeRequest
): Promise<InteractToggleLikeResult> => {
  const res = await ResourceInteractApi.toggleLike({ resourceId: params.resourceId });
  return ResourceServicesMap.mapInteractToggleLikeFromApi(res);
};

/** 评分（1–5），支持覆盖，返回最新 userScore */
const interactRate = async (params: InteractRateRequest): Promise<InteractRateResult> => {
  const res = await ResourceInteractApi.rate({
    resourceId: params.resourceId,
    score: params.score,
  });
  return ResourceServicesMap.mapInteractRateFromApi(res);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  updateResourceTags,
  updateResourceActionPermission,
  interactToggleLike,
  interactRate,
});
