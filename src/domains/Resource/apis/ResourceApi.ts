import { apiGet, apiPost } from '@/apis/request';
import { serializeRepeatKeyQuery } from '@/apis/serializeRepeatKeyQuery';
import type {
  AddInlineCommentItemApiRequest,
  AddTagApiRequest,
  ChangeInlineCommentResolveStatusApiRequest,
  ChangeResourceActionPermissionApiRequest,
  ChangeResourceTagsApiRequest,
  ChangeTagApiRequest,
  CreateInlineCommentApiRequest,
  DeleteInlineCommentItemApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
  GlobalSearchApiRequest,
  GlobalSearchApiResponse,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  ListResourceItemsApiRequest,
  MoveTagApiRequest,
  RemoveResourcesApiRequest,
  RemoveTagApiRequest,
  RenameResourceApiRequest,
  ResourceListPageApiResponse,
  UpdateInlineCommentItemApiRequest,
} from './ResourceApi.type';

// /resource/item/*

function listResources(req: ListResourceItemsApiRequest): Promise<ResourceListPageApiResponse> {
  return apiGet('/resource/item/listResources', {
    params: req,
    paramsSerializer: serializeRepeatKeyQuery,
  });
}

function renameResource(req: RenameResourceApiRequest): Promise<void> {
  return apiPost('/resource/item/renameResource', req);
}

function changeResourceTags(req: ChangeResourceTagsApiRequest): Promise<void> {
  return apiPost('/resource/item/changeResourceTags', req);
}

function changeResourceActionPermission(
  req: ChangeResourceActionPermissionApiRequest
): Promise<void> {
  return apiPost('/resource/item/changeResourceActionPermission', req);
}

function removeResources(req: RemoveResourcesApiRequest): Promise<void> {
  return apiPost('/resource/item/removeResources', null, {
    params: req,
    paramsSerializer: serializeRepeatKeyQuery,
  });
}

function globalSearch(req: GlobalSearchApiRequest): Promise<GlobalSearchApiResponse> {
  return apiGet('/resource/search/globalSearchResources', { params: req });
}

export const ResourceItemApi = {
  listResources,
  renameResource,
  changeResourceTags,
  changeResourceActionPermission,
  removeResources,
  globalSearch,
};

// /resource/tag/*
function getTagTree(req?: GetTagTreeApiRequest): Promise<GetTagTreeApiResponse> {
  return apiGet('/resource/tag/getTagTree', { params: req });
}

function addTag(req: AddTagApiRequest): Promise<string> {
  return apiPost('/resource/tag/addTag', req);
}

function changeTag(req: ChangeTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/changeTag', req);
}

function removeTag(req: RemoveTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/removeTag', req);
}

function moveTag(req: MoveTagApiRequest): Promise<void> {
  return apiPost('/resource/tag/moveTag', req);
}

export const ResourceTagApi = {
  getTagTree,
  addTag,
  changeTag,
  removeTag,
  moveTag,
};

function listInlineComments(
  req: ListInlineCommentsApiRequest
): Promise<ListInlineCommentsApiResponse> {
  return apiGet('/resource/inlineComment/listInlineComments', { params: req });
}

function createInlineComment(req: CreateInlineCommentApiRequest): Promise<string> {
  return apiPost('/resource/inlineComment/createInlineComment', req);
}

function addInlineCommentItem(req: AddInlineCommentItemApiRequest): Promise<string> {
  return apiPost('/resource/inlineComment/addInlineCommentItem', req);
}

function updateInlineCommentItem(req: UpdateInlineCommentItemApiRequest): Promise<void> {
  return apiPost('/resource/inlineComment/updateInlineCommentItem', req);
}

function deleteInlineCommentItem(req: DeleteInlineCommentItemApiRequest): Promise<void> {
  return apiPost('/resource/inlineComment/deleteInlineCommentItem', req);
}

function changeInlineCommentResolveStatus(
  req: ChangeInlineCommentResolveStatusApiRequest
): Promise<void> {
  return apiPost('/resource/inlineComment/changeInlineCommentResolveStatus', req);
}

export const ResourceInlineCommentApi = {
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
};
