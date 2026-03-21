import type { Group, GroupMember } from '@/types/group';

/** GroupService 接口：供依赖注入使用 */
export interface IGroupService {
  fetchGroupList(params: FetchGroupListRequest): Promise<{ groups: Group[]; total: number }>;
  fetchGroupInfo(groupId: string): Promise<Group>;
  createGroup(params: CreateGroupRequest): Promise<void>;
  editGroup(params: EditGroupRequest): Promise<void>;
  deleteGroup(params: DeleteGroupRequest): Promise<void>;
  fetchGroupMembers(
    groupId: string | number,
    page: number,
    size: number
  ): Promise<{ members: GroupMember[]; total: number }>;
  fetchMyRoleInGroup(groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'>;
  joinGroup(params: JoinGroupRequest): Promise<void>;
  quitGroup(params: QuitGroupRequest): Promise<void>;
  updateMemberRole(params: UpdateMemberRoleRequest): Promise<void>;
  kickMembers(params: KickMembersRequest): Promise<void>;
}

/** 获取小组列表响应 */
export interface FetchGroupListResponse {
  total: number;
  list: Group[];
}

/** GET /group/member/list 原始响应（与 OpenAPI 一致）；与 FetchGroupListResponse 同为 wire 形状 */
export interface FetchGroupMembersResponse {
  total: number;
  page: number;
  size: number;
  totalPage: number;
  list: GroupMember[];
}

/** 获取小组列表请求参数 */
export interface FetchGroupListRequest {
  relationType: 0 | 1;
  page: number;
  size: number;
}

/** 创建小组请求参数（与 OpenAPI addGroup 对齐） */
export interface CreateGroupRequest {
  groupName: string;
  groupType: number;
  groupDesc: string;
  groupCoverUrl?: string;
}

/** 编辑小组请求参数（与 OpenAPI changeGroup 对齐）；groupId 用 string 避免大数精度丢失 */
export interface EditGroupRequest {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
  groupType: number;
}

/** 解散小组请求参数 */
export interface DeleteGroupRequest {
  groupId: string;
}

/** 加入小组请求参数 */
export interface JoinGroupRequest {
  inviteCode: string;
}

/** 退出小组请求参数 */
export interface QuitGroupRequest {
  groupId: string;
}

/** 修改成员角色请求参数（与 OpenAPI changeRole 对齐）；ID 用 string 避免大数精度丢失 */
export interface UpdateMemberRoleRequest {
  groupId: string;
  targetUserIds: string[];
  role: number;
}

/** 批量踢出成员请求参数 */
export interface KickMembersRequest {
  groupId: string;
  targetUserIds: string[];
}
