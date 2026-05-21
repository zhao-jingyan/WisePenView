import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import { TAG_QUERY_LOGIC_MODE } from '../enum';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  RenameResourceRequest,
  ResourceListPage,
  UpdateResourceTagsRequest,
} from './index.type';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
): Promise<ResourceListPage> => {
  const query: ListResourceItemsApiRequest = {
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
  const d = await ResourceItemApi.listResources(query);
  return {
    list: (d?.list ?? []).map(ResourceServicesMap.mapResourceItemFromApi),
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
  await ResourceItemApi.renameResource(params);
};

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  await ResourceItemApi.changeResourceTags(params);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  updateResourceTags,
});
