/** 后端 /group/member/list 返回的成员项结构（与 OpenAPI 一致）；userId 用 string 避免大数精度丢失 */
export interface GroupMember {
  userId: string;
  realname: string;
  nickname: string;
  role: number;
  joinTime: string;
  avatar: string;
  limit?: number;
  used?: number;
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
