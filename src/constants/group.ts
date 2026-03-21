/** 小组类型 */
export const GROUP_TYPE = { NORMAL: 1, ADVANCED: 2, PUBLIC: 3 } as const;
export const GROUP_TYPE_LABELS: Record<number, string> = {
  1: '普通组',
  2: '高级组',
  3: '集市组',
};
export const getGroupTypeLabel = (v: number) => GROUP_TYPE_LABELS[v] ?? String(v);

/** 关系类型（我加入的 / 我管理的） */
export const RELATION_TYPE_MAP: Record<string, 0 | 1> = {
  managed: 0,
  joined: 1,
};

/** 小组成员角色码：0=OWNER，1=ADMIN，2=MEMBER（与后端约定一致） */
export const ROLE_MAP: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
export const ROLE_REVERSE_MAP: Record<number, string> = { 0: 'OWNER', 1: 'ADMIN', 2: 'MEMBER' };

/** 组内成员角色字符串（领域模型 GroupMember.role） */
export type GroupMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** 接口数字角色码 → 领域角色 */
export const mapRoleCodeToGroupMemberRole = (code: number): GroupMemberRole => {
  const key = ROLE_REVERSE_MAP[code];
  if (key === 'OWNER' || key === 'ADMIN' || key === 'MEMBER') return key;
  return 'MEMBER';
};

/** 角色文案（供 TableConfig 等复用） */
export const ROLE_LABEL: Record<string, string> = {
  MEMBER: '成员',
  ADMIN: '管理员',
  OWNER: '组长',
};

/** 身份类型 → 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
