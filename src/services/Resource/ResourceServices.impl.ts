import type { ResourceListPage } from './index.type';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  RenameResourceRequest,
  UpdateResourcePathRequest,
  UpdateResourceTagsRequest,
} from './index.type';
import { TAG_QUERY_LOGIC_MODE } from './index.type';
import type { IResourceService } from './index.type';
import Axios from '@/utils/Axios';
import { serializeRepeatKeyQuery } from '@/utils/serializeRepeatKeyQuery';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import { useRecentFilesStore } from '@/store';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Record<string, unknown> = {}
): Promise<ResourceListPage> => {
  const query: Record<string, unknown> = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    ...queryOverrides,
  };
  if (params.resourceType != null && params.resourceType !== '') {
    query.resourceType = params.resourceType;
  }
  if (params.tagIds != null && params.tagIds.length > 0) {
    query.tagIds = params.tagIds;
  }
  const res = (await Axios.get('/resource/item/listResources', {
    params: query,
    paramsSerializer: serializeRepeatKeyQuery,
  })) as ApiResponse<ResourceListPage>;
  checkResponse(res);
  const d = res.data;
  return {
    list: d?.list ?? [],
    total: d?.total ?? 0,
    page: d?.page ?? params.page,
    size: d?.size ?? params.size,
    totalPage: d?.totalPage ?? 0,
  };
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params, { groupId: params.groupId });
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  const res = (await Axios.post('/resource/item/renameResource', params)) as ApiResponse;
  checkResponse(res);
  // 重命名成功后，更新最近文件列表的文件名
  useRecentFilesStore.getState().updateFileName(params.resourceId, params.newName);
};

/** 当前 resource.openapi.json 未收录「资源归属路径」变更接口，仍对接既有 /resource/move */
const updateResourcePath = async (params: UpdateResourcePathRequest): Promise<void> => {
  const res = (await Axios.post('/resource/move', params)) as ApiResponse;
  checkResponse(res);
};

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  const res = (await Axios.post('/resource/item/changeResourceTags', params)) as ApiResponse;
  checkResponse(res);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  updateResourcePath,
  updateResourceTags,
});
