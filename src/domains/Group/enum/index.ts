import { createEnum } from '@/utils/enum';

/** 小组类型 */
export const GROUP = createEnum([
  { value: 1, key: 'NORMAL', label: '普通组' },
  { value: 2, key: 'ADVANCED', label: '高级组' },
  { value: 3, key: 'PUBLIC', label: '集市组' },
] as const);
export const GROUP_TYPE = GROUP.values;
export const GROUP_TYPE_LABELS: Record<number, string> = GROUP.labels;
export const getGroupTypeLabel = (v: number) => GROUP_TYPE_LABELS[v] ?? String(v);

/** 关系类型（我加入的 / 我管理的） */
export const GROUP_ROLE_FILTER_MAP: Record<string, 'JOINED' | 'MANAGED'> = {
  joined: 'JOINED',
  managed: 'MANAGED',
};

/** 小组成员角色码：0=OWNER，1=ADMIN，2=MEMBER（与后端约定一致） */
export const ROLE = createEnum([
  { value: 0, key: 'OWNER', label: '组长' },
  { value: 1, key: 'ADMIN', label: '管理员' },
  { value: 2, key: 'MEMBER', label: '成员' },
] as const);
export const ROLE_MAP = ROLE.values;

/** 组内成员角色字符串（领域模型 GroupMember.role） */
export type GroupMemberRole = keyof typeof ROLE_MAP;

/** 接口数字角色码 -> 领域角色 */
export const mapRoleCodeToGroupMemberRole = (code: number): GroupMemberRole => {
  return ROLE.configs[code as keyof typeof ROLE.configs]?.key ?? 'MEMBER';
};

/** 角色文案（供 TableConfig 等复用） */
export const ROLE_LABEL: Record<GroupMemberRole, string> = Object.fromEntries(
  ROLE.options.map((item) => [item.key, item.label])
) as Record<GroupMemberRole, string>;

/** 身份类型 -> 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
