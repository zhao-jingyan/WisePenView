import {
  actionsToPermissionCode,
  coerceResourceActions,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  RESOURCE_ACTION,
  type ResourceAction,
  updateResourceActionSelection,
} from '@/domains/Resource';
import type { EnumKey, EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 与 OpenAPI 文档语义对应的别名，值为接口要求的字符串 */
export const TAG_VISIBILITY_MODE = createEnum([
  { value: '0', key: 'ALL', label: '全部可见' },
  { value: '1', key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: '2', key: 'WHITELIST', label: '白名单' },
  { value: '3', key: 'BLACKLIST', label: '黑名单' },
] as const);

/** OpenAPI TagTreeResponse.visibilityMode / TagCreateRequest / TagUpdateRequest */
export type TagVisibilityModeString = EnumValue<typeof TAG_VISIBILITY_MODE>;

export type TagVisibilityMode = EnumValue<typeof TAG_VISIBILITY_MODE>;

/** 访问控制范围（与 OpenAPI AccessControlScope 对齐） */
export const ACCESS_CONTROL_SCOPE = createEnum([
  { value: 0, key: 'ALL', label: '全部' },
  { value: 1, key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: 2, key: 'WHITELIST', label: '白名单' },
  { value: 3, key: 'BLACKLIST', label: '黑名单' },
] as const);

export type AccessControlScope = EnumValue<typeof ACCESS_CONTROL_SCOPE>;
export type AccessControlScopeKey = EnumKey<typeof ACCESS_CONTROL_SCOPE>;

/** 标签资源策略复用 Resource 领域的动作枚举，避免维护第二套权限位定义。 */
export const TAG_RESOURCE_ACTION = RESOURCE_ACTION;

export type TagResourceAction = ResourceAction;
export type TagResourceActionKey = EnumKey<typeof TAG_RESOURCE_ACTION>;
export type TagPermissionPresetKey = 'private' | 'readonly' | 'shared' | 'custom';
type TagPermissionConcretePresetKey = Exclude<TagPermissionPresetKey, 'custom'>;
/** 挂载权限不是 ResourceAction，用虚拟 action 接入标签权限列表。 */
export const TAG_PERMISSION_MOUNT_ACTION_KEY = 'TAG_MOUNT' as const;

export interface TagPermissionPresetValues {
  taggedResourceAclGrantScope: AccessControlScope;
  tagMountPermissionScope: AccessControlScope;
  grantedActions: TagResourceAction[];
}

export interface TagPermissionActionValues {
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
}

export type TagPermissionListAction =
  | {
      kind: 'tagMount';
      key: typeof TAG_PERMISSION_MOUNT_ACTION_KEY;
      label: string;
    }
  | {
      kind: 'resource';
      key: TagResourceActionKey;
      label: string;
      action: TagResourceAction;
    };

/** 标签权限预设的领域值；UI 文案由调用方自行组合。 */
export const TAG_PERMISSION_PRESET_VALUES: Record<
  TagPermissionConcretePresetKey,
  TagPermissionPresetValues
> = {
  private: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
    tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
    grantedActions: [],
  },
  readonly: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
    tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
    grantedActions: normalizeResourceActions([TAG_RESOURCE_ACTION.VIEW]),
  },
  shared: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
    tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
    grantedActions: normalizeResourceActions([
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.INLINE_COMMENT,
      TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
      TAG_RESOURCE_ACTION.FORK,
      TAG_RESOURCE_ACTION.COMMENT,
    ]),
  },
};

export const getTagPermissionPresetValues = (
  key: TagPermissionPresetKey
): TagPermissionPresetValues | undefined =>
  key === 'custom' ? undefined : TAG_PERMISSION_PRESET_VALUES[key];

export const TAG_PERMISSION_LIST_ACTIONS: TagPermissionListAction[] = [
  {
    kind: 'tagMount',
    key: TAG_PERMISSION_MOUNT_ACTION_KEY,
    label: '挂载资源',
  },
  ...TAG_RESOURCE_ACTION.options.map((item) => ({
    kind: 'resource' as const,
    key: item.key,
    label: item.label,
    action: item.value as TagResourceAction,
  })),
];

const isTagMountPermissionSelected = (scope?: AccessControlScope): boolean =>
  (scope ?? ACCESS_CONTROL_SCOPE.ALL) !== ACCESS_CONTROL_SCOPE.ONLY_ADMIN;

export const isTagPermissionListActionSelected = (
  values: TagPermissionActionValues,
  listAction: TagPermissionListAction
): boolean => {
  if (listAction.kind === 'tagMount') {
    return isTagMountPermissionSelected(values.tagMountPermissionScope);
  }
  return normalizeResourceActions(values.grantedActions).includes(listAction.action);
};

export const buildTagPermissionListActionSelectionPatch = (
  values: TagPermissionActionValues,
  listAction: TagPermissionListAction,
  checked: boolean
): Partial<TagPermissionActionValues> => {
  if (listAction.kind === 'tagMount') {
    return {
      tagMountPermissionScope: checked ? ACCESS_CONTROL_SCOPE.ALL : ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
      tagMountSpecifiedUsers: [],
    };
  }

  return {
    grantedActions: updateResourceActionSelection(
      values.grantedActions,
      listAction.action,
      checked
    ),
  };
};

export {
  actionsToPermissionCode,
  coerceResourceActions,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  updateResourceActionSelection,
};

export const resourceActionsToApiKeys = (
  actions?: TagResourceAction[]
): TagResourceActionKey[] | undefined => {
  if (!actions) return undefined;
  return normalizeResourceActions(actions)
    .map((action) => TAG_RESOURCE_ACTION.getKey(action))
    .filter((key): key is TagResourceActionKey => key != null);
};
