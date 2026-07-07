import {
  ACCESS_CONTROL_SCOPE,
  normalizeResourceActions,
  TAG_RESOURCE_ACTION,
  type AccessControlScope,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';

export type TagPermissionPresetKey = 'private' | 'readonly' | 'shared' | 'custom';
export type TagPermissionResourceStrategyKey = 'note' | 'file' | 'drawio' | 'aiAsset';

export interface TagPermissionPresetValues {
  taggedResourceAclGrantScope: AccessControlScope;
  tagMountPermissionScope: AccessControlScope;
  grantedActions: TagResourceAction[];
}

export interface TagPermissionPresetOption {
  key: TagPermissionPresetKey;
  label: string;
  description: string;
  detail: string;
  values?: TagPermissionPresetValues;
}

export interface TagPermissionResourceStrategy {
  key: TagPermissionResourceStrategyKey;
  label: string;
  supportedActions: TagResourceAction[];
}

export interface TagPermissionActionRow {
  action: TagResourceAction;
  key: string;
  label: string;
  supportedStrategyKeys: TagPermissionResourceStrategyKey[];
}

const ALL_RESOURCE_ACTIONS = TAG_RESOURCE_ACTION.options.map(
  (item) => item.value as TagResourceAction
);

export const TAG_PERMISSION_RESOURCE_STRATEGIES: TagPermissionResourceStrategy[] = [
  {
    key: 'note',
    label: '笔记',
    supportedActions: [
      TAG_RESOURCE_ACTION.DISCOVER,
      TAG_RESOURCE_ACTION.VIEW,
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.INLINE_COMMENT,
      TAG_RESOURCE_ACTION.FORK,
      TAG_RESOURCE_ACTION.COMMENT,
    ],
  },
  {
    key: 'file',
    label: '文件',
    supportedActions: ALL_RESOURCE_ACTIONS.filter((action) => action !== TAG_RESOURCE_ACTION.LOAD),
  },
  {
    key: 'drawio',
    label: '画板',
    supportedActions: [
      TAG_RESOURCE_ACTION.DISCOVER,
      TAG_RESOURCE_ACTION.VIEW,
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.FORK,
    ],
  },
  {
    key: 'aiAsset',
    label: 'AI 资产',
    supportedActions: ALL_RESOURCE_ACTIONS,
  },
];

export const TAG_PERMISSION_ACTION_ROWS: TagPermissionActionRow[] = TAG_RESOURCE_ACTION.options.map(
  (item) => ({
    action: item.value as TagResourceAction,
    key: item.key,
    label: item.label,
    supportedStrategyKeys: TAG_PERMISSION_RESOURCE_STRATEGIES.filter((strategy) =>
      strategy.supportedActions.includes(item.value as TagResourceAction)
    ).map((strategy) => strategy.key),
  })
);

const PRIVATE_PRESET_VALUES: TagPermissionPresetValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
  grantedActions: [],
};

const READONLY_PRESET_VALUES: TagPermissionPresetValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
  grantedActions: normalizeResourceActions([TAG_RESOURCE_ACTION.VIEW]),
};

const SHARED_PRESET_VALUES: TagPermissionPresetValues = {
  taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
  tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
  grantedActions: normalizeResourceActions([
    TAG_RESOURCE_ACTION.EDIT,
    TAG_RESOURCE_ACTION.INLINE_COMMENT,
    TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
    TAG_RESOURCE_ACTION.FORK,
    TAG_RESOURCE_ACTION.COMMENT,
  ]),
};

export const TAG_PERMISSION_PRESETS: TagPermissionPresetOption[] = [
  {
    key: 'private',
    label: '私密',
    description: '仅所有者和管理员可访问',
    detail: '适合草稿、归档或尚未准备公开的资料。',
    values: PRIVATE_PRESET_VALUES,
  },
  {
    key: 'readonly',
    label: '只读',
    description: '成员可以查看，不能协作修改',
    detail: '适合制度、手册、发布版材料。',
    values: READONLY_PRESET_VALUES,
  },
  {
    key: 'shared',
    label: '共享',
    description: '成员可以阅读、评论和常用协作',
    detail: '适合团队共建资料，默认不开放源文件下载。',
    values: SHARED_PRESET_VALUES,
  },
  {
    key: 'custom',
    label: '自定义',
    description: '进入高级权限表格',
    detail: '细调标签级资源权限动作。',
  },
];

const PRESET_VALUES_BY_KEY = Object.fromEntries(
  TAG_PERMISSION_PRESETS.filter((preset) => preset.values).map((preset) => [
    preset.key,
    preset.values as TagPermissionPresetValues,
  ])
) as Partial<Record<TagPermissionPresetKey, TagPermissionPresetValues>>;

const createActionSet = (actions: TagResourceAction[] | undefined): Set<TagResourceAction> =>
  new Set(normalizeResourceActions(actions));

const isSameActionSet = (
  left: TagResourceAction[] | undefined,
  right: TagResourceAction[] | undefined
): boolean => {
  const leftSet = createActionSet(left);
  const rightSet = createActionSet(right);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((action) => rightSet.has(action));
};

const isPresetValuesMatched = (
  presetValues: TagPermissionPresetValues,
  values: Partial<TagPermissionPresetValues>
): boolean =>
  presetValues.taggedResourceAclGrantScope === values.taggedResourceAclGrantScope &&
  presetValues.tagMountPermissionScope === values.tagMountPermissionScope &&
  isSameActionSet(presetValues.grantedActions, values.grantedActions);

export const getTagPermissionPresetValues = (
  key: TagPermissionPresetKey
): TagPermissionPresetValues | undefined => PRESET_VALUES_BY_KEY[key];

export const getTagPermissionPresetOption = (
  key: TagPermissionPresetKey
): TagPermissionPresetOption => TAG_PERMISSION_PRESETS.find((preset) => preset.key === key)!;

export const resolveTagPermissionPresetKey = (
  values: Partial<TagPermissionPresetValues>
): TagPermissionPresetKey => {
  const matchedPreset = TAG_PERMISSION_PRESETS.find((preset) => {
    if (!preset.values) return false;
    return isPresetValuesMatched(preset.values, values);
  });
  return matchedPreset?.key ?? 'custom';
};

export const resolveTagPermissionPresetKeyFromTag = (
  tag: TagTreeNode | undefined
): TagPermissionPresetKey => {
  if (!tag) return 'custom';
  return resolveTagPermissionPresetKey({
    taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope,
    tagMountPermissionScope: tag.tagMountPermissionScope,
    grantedActions: tag.grantedActions,
  });
};
