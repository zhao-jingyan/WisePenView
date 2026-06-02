import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
} from '@/domains/Resource/apis/ResourceApi.type';
import {
  normalizeResourceActions,
  resourceActionsToApiKeys,
  TAG_RESOURCE_ACTION,
  TAG_VISIBILITY_MODE,
  type TagResourceAction,
  type TagVisibilityModeString,
} from '@/domains/Tag';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import type { TagCreateRequest, TagTreeNode, TagUpdateRequest } from '../service/index.type';

const mapGetTagTreeRequest = (groupId?: string): GetTagTreeApiRequest | undefined => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  return normalizedGroupId
    ? {
        groupId: normalizedGroupId,
      }
    : undefined;
};

const isTagVisibilityModeString = (value: unknown): value is TagVisibilityModeString =>
  typeof value === 'string' && TAG_VISIBILITY_MODE.getKey(value) != null;

const mapGrantedActionsFromApi = (actions: unknown): TagResourceAction[] | undefined => {
  if (!Array.isArray(actions)) return undefined;
  const normalized = actions
    .map((item) => Number(item))
    .filter((item): item is TagResourceAction => TAG_RESOURCE_ACTION.getKey(item) != null);
  return normalizeResourceActions(normalized);
};

const mapTagTreeNodeFromApi = (node: GetTagTreeApiResponse[number]): TagTreeNode => {
  const visibilityMode = node.visibilityMode;
  const normalizedVisibilityMode = isTagVisibilityModeString(visibilityMode)
    ? visibilityMode
    : undefined;

  return {
    ...node,
    // fallback：兼容后端返回未约束的 visibilityMode 字符串
    visibilityMode: normalizedVisibilityMode,
    // fallback：兼容后端返回 number[] 类型的 grantedActions
    grantedActions: mapGrantedActionsFromApi(node.grantedActions),
    children: node.children?.map(mapTagTreeNodeFromApi),
  };
};

const mapTagTreeFromApi = (data: GetTagTreeApiResponse): TagTreeNode[] =>
  data.map(mapTagTreeNodeFromApi);

const mapAddTagRequest = (params: TagCreateRequest): AddTagApiRequest => ({
  ...params,
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapUpdateTagRequest = (params: TagUpdateRequest): ChangeTagApiRequest => ({
  ...params,
  grantedActions: resourceActionsToApiKeys(params.grantedActions),
});

const mapAddTagFromApi = (data: string): string => {
  // fallback：旧接口可能返回空 data，保持原有空串行为
  return data ?? '';
};

export const TagServicesMap = {
  mapGetTagTreeRequest,
  mapTagTreeFromApi,
  mapAddTagRequest,
  mapUpdateTagRequest,
  mapAddTagFromApi,
};
