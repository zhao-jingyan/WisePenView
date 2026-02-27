/** 小组类型配置（单一数据源） */
const GROUP_TYPE_CONFIG = {
  NORMAL: { value: 1, label: '普通组' },
  ADVANCED: { value: 2, label: '高级组' },
  PUBLIC: { value: 3, label: '集市组' },
} as const;

type GroupTypeKey = keyof typeof GROUP_TYPE_CONFIG;

/** 小组类型枚举值 */
export const GROUP_TYPE = {
  NORMAL: GROUP_TYPE_CONFIG.NORMAL.value,
  ADVANCED: GROUP_TYPE_CONFIG.ADVANCED.value,
  PUBLIC: GROUP_TYPE_CONFIG.PUBLIC.value,
} as const;

const VALUE_TO_KEY: Record<number, GroupTypeKey> = (
  Object.entries(GROUP_TYPE_CONFIG) as [GroupTypeKey, (typeof GROUP_TYPE_CONFIG)[GroupTypeKey]][]
).reduce<Record<number, GroupTypeKey>>((acc, [key, { value }]) => {
  acc[value] = key;
  return acc;
}, {});

/** 根据数字或字符串 key 获取小组类型文案 */
export const getGroupTypeLabel = (keyOrValue: number | string): string =>
  typeof keyOrValue === 'number'
    ? (GROUP_TYPE_CONFIG[VALUE_TO_KEY[keyOrValue]]?.label ?? String(keyOrValue))
    : (GROUP_TYPE_CONFIG[keyOrValue as GroupTypeKey]?.label ?? String(keyOrValue));

/** 根据数字获取字符串 key（供 PermissionConfig 等查表） */
export const getGroupTypeStr = (value: number): string => VALUE_TO_KEY[value] ?? 'NORMAL';

/** 小组类型选项（供 CreateGroupModal 等下拉使用） */
export const GROUP_TYPE_OPTIONS = (
  Object.entries(GROUP_TYPE_CONFIG) as [GroupTypeKey, (typeof GROUP_TYPE_CONFIG)[GroupTypeKey]][]
).map(([, { value, label }]) => ({ value, label }));

/** 关系类型（我加入的 / 我管理的） */
export const RELATION_TYPE_MAP: Record<string, 1 | 2> = {
  joined: 2,
  managed: 1,
};

/** 身份类型 → 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
