import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
} from '@/domains/Resource/apis/ResourceApi.type';
import {
  ACCESS_CONTROL_SCOPE,
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
    // fallback：旧接口缺省 ACL scope 时按全员可见处理。
    taggedResourceAclGrantScope: node.taggedResourceAclGrantScope ?? ACCESS_CONTROL_SCOPE.ALL,
    // fallback：旧接口缺省指定用户列表时按空列表处理。
    taggedResourceAclGrantSpecifiedUsers: node.taggedResourceAclGrantSpecifiedUsers ?? [],
    // fallback：兼容后端返回 number[] 类型的 grantedActions，缺省时为空权限数组
    grantedActions: mapGrantedActionsFromApi(node.grantedActions) ?? [],
    // fallback：旧接口缺省挂载 scope 时按全员可挂载处理。
    tagMountPermissionScope: node.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL,
    // fallback：旧接口缺省挂载指定用户列表时按空列表处理。
    tagMountSpecifiedUsers: node.tagMountSpecifiedUsers ?? [],
    // fallback：历史标签树叶子节点可能省略 children，领域层统一消费稳定数组
    children: node.children?.map(mapTagTreeNodeFromApi) ?? [],
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
