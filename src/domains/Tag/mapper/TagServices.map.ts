import type {
  AddTagApiRequest,
  ChangeTagApiRequest,
  GetTagTreeApiRequest,
  GetTagTreeApiResponse,
} from '@/domains/Resource/apis/ResourceApi.type';
import {
  ACCESS_CONTROL_SCOPE,
  coerceResourceActions,
  normalizeResourceActions,
  permissionCodeToActions,
  resourceActionsToApiKeys,
  TAG_VISIBILITY_MODE,
  type AccessControlScope,
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

const coerceAccessControlScope = (value: unknown): AccessControlScope | undefined => {
  if (typeof value === 'number' && value in ACCESS_CONTROL_SCOPE.configs) {
    return value as AccessControlScope;
  }
  if (typeof value !== 'string') return undefined;
  const byKey = (ACCESS_CONTROL_SCOPE.values as Record<string, number>)[value];
  if (byKey !== undefined) return byKey as AccessControlScope;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber in ACCESS_CONTROL_SCOPE.configs) {
    return asNumber as AccessControlScope;
  }
  return undefined;
};

const coercePermissionMask = (mask: unknown): number | undefined => {
  if (typeof mask === 'number' && Number.isFinite(mask)) return mask;
  if (typeof mask !== 'string') return undefined;
  const parsed = Number(mask);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapGrantedActionsFromApi = (
  actions: unknown,
  grantedActionsMask: unknown
): TagResourceAction[] | undefined => {
  const mask = coercePermissionMask(grantedActionsMask);
  if (Array.isArray(actions)) {
    const resolvedActions = coerceResourceActions(actions);
    if (resolvedActions.length > 0 || !mask) return resolvedActions;
  }
  if (mask === undefined) return undefined;
  return normalizeResourceActions(permissionCodeToActions(mask));
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
    taggedResourceAclGrantScope: coerceAccessControlScope(node.taggedResourceAclGrantScope),
    tagMountPermissionScope: coerceAccessControlScope(node.tagMountPermissionScope),
    // fallback：兼容后端返回枚举名字符串、历史 number[] 或仅返回 mask 的 grantedActions
    grantedActions: mapGrantedActionsFromApi(
      node.grantedActions,
      node.taggedResourceGrantedActionsMask
    ),
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
