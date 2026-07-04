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
  if (!normalizedGroupId) {
    return undefined;
  }
  return {
    groupId: normalizedGroupId,
  };
};

const isTagVisibilityModeString = (value: unknown): value is TagVisibilityModeString => {
  if (typeof value !== 'string') {
    return false;
  }
  return TAG_VISIBILITY_MODE.getKey(value) != null;
};

const mapGrantedActionsFromApi = (actions: unknown): TagResourceAction[] | undefined => {
  if (!Array.isArray(actions)) return undefined;
  const normalized: TagResourceAction[] = [];
  for (const item of actions) {
    const action = Number(item);
    if (TAG_RESOURCE_ACTION.getKey(action) == null) continue;
    normalized.push(action as TagResourceAction);
  }
  return normalizeResourceActions(normalized);
};

const mapTagTreeNodeFromApi = (node: GetTagTreeApiResponse[number]): TagTreeNode => {
  const visibilityMode = node.visibilityMode;
  let normalizedVisibilityMode: TagVisibilityModeString | undefined;
  if (isTagVisibilityModeString(visibilityMode)) {
    normalizedVisibilityMode = visibilityMode;
  }
  const children: TagTreeNode[] = [];
  for (const child of node.children ?? []) {
    children.push(mapTagTreeNodeFromApi(child));
  }

  return {
    tagId: node.tagId,
    tagName: node.tagName,
    groupId: node.groupId,
    tagDesc: node.tagDesc,
    tagIcon: node.tagIcon,
    tagColor: node.tagColor,
    tagCreator: node.tagCreator,
    isPath: node.isPath,
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
    taggedResourceGrantedActionsMask: node.taggedResourceGrantedActionsMask,
    parentId: node.parentId,
    // fallback：历史标签树叶子节点可能省略 children，领域层统一消费稳定数组
    children,
  };
};

const mapTagTreeFromApi = (data: GetTagTreeApiResponse): TagTreeNode[] => {
  const roots: TagTreeNode[] = [];
  for (const node of data) {
    roots.push(mapTagTreeNodeFromApi(node));
  }
  return roots;
};

const mapAddTagRequest = (params: TagCreateRequest): AddTagApiRequest => {
  return {
    groupId: params.groupId,
    parentId: params.parentId,
    tagName: params.tagName,
    tagDesc: params.tagDesc,
    tagIcon: params.tagIcon,
    tagColor: params.tagColor,
    tagCreator: params.tagCreator,
    isPath: params.isPath,
    visibilityMode: params.visibilityMode,
    taggedResourceAclGrantScope: params.taggedResourceAclGrantScope,
    taggedResourceAclGrantSpecifiedUsers: params.taggedResourceAclGrantSpecifiedUsers,
    tagMountPermissionScope: params.tagMountPermissionScope,
    tagMountSpecifiedUsers: params.tagMountSpecifiedUsers,
    grantedActions: resourceActionsToApiKeys(params.grantedActions),
  };
};

const mapUpdateTagRequest = (params: TagUpdateRequest): ChangeTagApiRequest => {
  return {
    groupId: params.groupId,
    targetTagId: params.targetTagId,
    tagName: params.tagName,
    tagDesc: params.tagDesc,
    tagIcon: params.tagIcon,
    tagColor: params.tagColor,
    tagCreator: params.tagCreator,
    isPath: params.isPath,
    visibilityMode: params.visibilityMode,
    taggedResourceAclGrantScope: params.taggedResourceAclGrantScope,
    taggedResourceAclGrantSpecifiedUsers: params.taggedResourceAclGrantSpecifiedUsers,
    tagMountPermissionScope: params.tagMountPermissionScope,
    tagMountSpecifiedUsers: params.tagMountSpecifiedUsers,
    grantedActions: resourceActionsToApiKeys(params.grantedActions),
  };
};

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
