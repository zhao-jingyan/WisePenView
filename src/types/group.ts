export const ROLE_MAP: Record<string, number> = { OWNER: 1, ADMIN: 2, MEMBER: 3 };
export const ROLE_REVERSE_MAP: Record<number, string> = { 1: 'OWNER', 2: 'ADMIN', 3: 'MEMBER' };

/** /group/member/my-role 接口专用：该接口返回的角色码为 0-OWNER, 1-ADMIN, 2-MEMBER，与 ROLE_MAP/ROLE_REVERSE_MAP(1/2/3) 不同 */
export const API_MY_ROLE_MAP: Record<number, 'OWNER' | 'ADMIN' | 'MEMBER'> = {
  0: 'OWNER',
  1: 'ADMIN',
  2: 'MEMBER',
};

/** 角色文案（供 TableConfig、PermissionConfigPreview 等复用） */
export const ROLE_LABEL: Record<string, string> = {
  MEMBER: '成员',
  ADMIN: '管理员',
  OWNER: '组长',
};

/** 后端 /group/member/list 返回的成员项结构（与 OpenAPI 一致） */
export interface GroupMember {
  userId: number;
  realname: string;
  nickname: string;
  role: number;
  joinTime: string;
  avatar: string;
  limit?: number;
  used?: number;
}

/** 后端 /group/member/list 分页响应结构 */
export interface MemberListPage {
  total: number;
  page: number;
  size: number;
  totalPage: number;
  list: GroupMember[];
}

/** OpenAPI UserDisplayBase，创建者/成员展示信息 */
export interface GroupOwnerInfo {
  nickname: string;
  realName?: string;
  avatar?: string;
  identityType?: number;
}

/** 小组结构（与 OpenAPI GroupDetailInfoResponse/GroupItemInfoResponse 对齐） */
export interface Group {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
  ownerId?: string;
  ownerInfo?: GroupOwnerInfo;
  memberCount: number;
  createTime?: string;
  inviteCode?: string;
  tokenUsed?: number;
  tokenBalance?: number;
}
