import type { GroupMemberRole } from '@/constants/group';

/** 成员列表领域模型（由 OpenAPI GroupMemberDetailResponse 映射）；userId 对应接口 memberId，避免大数精度丢失 */
export interface GroupMember {
  userId: string;
  realname: string;
  nickname: string;
  /** 组内角色（由接口数字角色码经 mapRoleCodeToGroupMemberRole 映射） */
  role: GroupMemberRole;
  joinTime: string;
  avatar: string;
  limit?: number;
  used?: number;
}

/** 成员列表分页（领域层，由 GET /group/member/list 的 data 映射） */
export interface GroupMemberList {
  members: GroupMember[];
  total: number;
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
