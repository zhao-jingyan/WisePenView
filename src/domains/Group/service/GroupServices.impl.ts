import type { Group, GroupFileOrgLogic, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { mapRoleCodeToGroupMemberRole } from '@/domains/Group/enum';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { GroupApi, GroupMemberApi, GroupResConfigApi } from '../apis/GroupApi';
import { mapGroupMemberRawResponse } from '../mapper/groupMember.mapper';
import type {
  CreateGroupRequest,
  DeleteGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  FetchGroupListResponse,
  FetchGroupMembersResponse,
  GetGroupWalletInfoRequest,
  IGroupService,
  JoinGroupRequest,
  KickMembersRequest,
  QuitGroupRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from './index.type';

type GroupRaw = { groupId?: string | number } & Record<string, unknown>;

/** 将接口返回的 groupId 归一化为 string，避免 JSON 解析大数时精度丢失 */
const normalizeGroup = (g: GroupRaw): Group =>
  ({
    ...g,
    groupId: normalizeId(g.groupId),
    createTime: formatTimestampToDate((g as { createTime?: number | string | null }).createTime),
  }) as Group;

const isGroupFileOrgLogic = (v: unknown): v is GroupFileOrgLogic => v === 'FOLDER' || v === 'TAG';

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const { groupRoleFilter, page, size } = params;
  const payload = (await GroupApi.list({ groupRoleFilter, page, size })) as FetchGroupListResponse;
  const list = (payload?.list ?? []) as unknown as GroupRaw[];
  return {
    groups: list.map(normalizeGroup),
    total: Number(payload?.total) || 0,
  };
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const myRole = await fetchMyRoleInGroup(groupId);
  const data: Group | null = await (myRole === 'MEMBER'
    ? GroupApi.getGroupBaseInfo({ groupId })
    : GroupApi.getGroupDetailInfo({ groupId }));
  if (!data) throw new Error('获取小组详情失败');
  return normalizeGroup(data as unknown as GroupRaw);
};

const getGroupWalletInfo = async (params: GetGroupWalletInfoRequest): Promise<number> => {
  const { groupId } = params;
  if (!groupId) throw new Error('小组 ID 不能为空');
  const data = await GroupApi.getGroupDetailInfo({ groupId });
  if (!data) throw new Error('获取小组钱包信息失败');
  return data.tokenBalance ?? 0;
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  const data = await GroupResConfigApi.getConfig({ groupId });
  if (!data) throw new Error('获取小组资源配置失败');
  const { fileOrgLogic, groupId: gid } = data;
  if (!isGroupFileOrgLogic(fileOrgLogic)) {
    throw new Error('资源配置格式异常');
  }
  return {
    groupId: normalizeId(gid ?? groupId),
    fileOrgLogic,
  };
};

const updateGroupResConfig = async (params: UpdateGroupResConfigRequest) => {
  await GroupResConfigApi.changeConfig(params);
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  const payload = await GroupApi.addGroup(params);
  if (payload == null) {
    throw new Error('创建小组失败');
  }
  const groupId = normalizeId(payload);
  if (!groupId) {
    throw new Error('创建小组失败');
  }
  return groupId;
};

const editGroup = async (params: EditGroupRequest) => {
  await GroupApi.changeGroup(params);
};

const deleteGroup = async (params: DeleteGroupRequest) => {
  await GroupApi.removeGroup(params);
};

const fetchGroupMembers = async (
  groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  const data = (await GroupMemberApi.list({
    groupId,
    page,
    size,
  })) as FetchGroupMembersResponse | null;
  if (!data) {
    return { members: [], total: 0 };
  }
  return {
    members: (data.list ?? []).map(mapGroupMemberRawResponse),
    total: Number(data.total) || 0,
  };
};

const fetchMyRoleInGroup = async (groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> => {
  const data = await GroupMemberApi.getMyRole(groupId);
  const roleNum = typeof data === 'number' ? data : data?.role;
  if (roleNum == null || roleNum < 0) throw new Error('获取角色失败');
  return mapRoleCodeToGroupMemberRole(roleNum);
};

const joinGroup = async (params: JoinGroupRequest) => {
  await GroupApi.joinGroup(params);
};

const quitGroup = async (params: QuitGroupRequest) => {
  await GroupMemberApi.quit(params);
};

const updateMemberRole = async (params: UpdateMemberRoleRequest) => {
  await GroupMemberApi.changeRole(params);
};

const kickMembers = async (params: KickMembersRequest) => {
  await GroupMemberApi.kick(params);
};

export const createGroupServices = (): IGroupService => ({
  fetchGroupList,
  fetchGroupInfo,
  getGroupWalletInfo,
  fetchGroupResConfig,
  updateGroupResConfig,
  createGroup,
  editGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyRoleInGroup,
  joinGroup,
  quitGroup,
  updateMemberRole,
  kickMembers,
});
