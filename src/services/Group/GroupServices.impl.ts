import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toIdString } from '@/utils/number';
import { mapRoleCodeToGroupMemberRole } from '@/constants/group';
import type { Group, GroupMemberList } from '@/types/group';
import type { ApiResponse } from '@/types/api';
import type {
  FetchGroupListRequest,
  FetchGroupListResponse,
  FetchGroupMembersResponse,
  CreateGroupRequest,
  EditGroupRequest,
  DeleteGroupRequest,
  JoinGroupRequest,
  QuitGroupRequest,
  UpdateMemberRoleRequest,
  KickMembersRequest,
} from './index.type';
import type { IGroupService } from './index.type';
import { mapGroupMemberRawResponse } from './groupMember.mapper';

type GroupRaw = { groupId?: string | number } & Record<string, unknown>;

/** 将接口返回的 groupId 归一化为 string，避免 JSON 解析大数时精度丢失 */
const normalizeGroup = (g: GroupRaw): Group => ({ ...g, groupId: toIdString(g.groupId) }) as Group;

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const { relationType, page, size } = params;
  const res = (await Axios.get('/group/list', {
    params: { groupRoleType: relationType, page, size },
  })) as ApiResponse<FetchGroupListResponse>;
  checkResponse(res);
  const payload = res.data;
  const list = (payload?.list ?? []) as unknown as GroupRaw[];
  return {
    groups: list.map(normalizeGroup),
    total: Number(payload?.total) ?? 0,
  };
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const res = (await Axios.get('/group/getGroupDetailInfo', {
    params: { groupId },
  })) as ApiResponse<Group>;
  checkResponse(res);
  if (!res.data) throw new Error('获取小组详情失败');
  return normalizeGroup(res.data as unknown as GroupRaw);
};

const createGroup = async (params: CreateGroupRequest) => {
  const res = (await Axios.post('/group/addGroup', params)) as ApiResponse;
  checkResponse(res);
};

const editGroup = async (params: EditGroupRequest) => {
  const res = (await Axios.post('/group/changeGroup', params)) as ApiResponse;
  checkResponse(res);
};

const deleteGroup = async (params: DeleteGroupRequest) => {
  const res = (await Axios.post('/group/removeGroup', params)) as ApiResponse;
  checkResponse(res);
};

const fetchGroupMembers = async (
  groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  const res = (await Axios.get('/group/member/list', {
    params: { groupId, page, size },
  })) as ApiResponse<FetchGroupMembersResponse>;
  checkResponse(res);
  if (!res.data) {
    return { members: [], total: 0 };
  }
  const data = res.data;
  return {
    members: (data.list ?? []).map(mapGroupMemberRawResponse),
    total: Number(data.total) || 0,
  };
};

const fetchMyRoleInGroup = async (groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> => {
  const res = (await Axios.get('/group/member/getMyRole', {
    params: { groupId },
  })) as ApiResponse<number | { role: number }>;
  checkResponse(res);
  const roleNum = typeof res.data === 'number' ? res.data : res.data?.role;
  if (roleNum == null || roleNum < 0) throw new Error('获取角色失败');
  return mapRoleCodeToGroupMemberRole(roleNum);
};

const joinGroup = async (params: JoinGroupRequest) => {
  const res = (await Axios.post('/group/joinGroup', params)) as ApiResponse;
  checkResponse(res);
};

const quitGroup = async (params: QuitGroupRequest) => {
  const res = (await Axios.post('/group/member/quit', params)) as ApiResponse;
  checkResponse(res);
};

const updateMemberRole = async (params: UpdateMemberRoleRequest) => {
  const res = (await Axios.post('/group/member/changeRole', params)) as ApiResponse;
  checkResponse(res);
};

const kickMembers = async (params: KickMembersRequest) => {
  const res = (await Axios.post('/group/member/kick', params)) as ApiResponse;
  checkResponse(res);
};

export const GroupServicesImpl: IGroupService = {
  fetchGroupList,
  fetchGroupInfo,
  createGroup,
  editGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyRoleInGroup,
  joinGroup,
  quitGroup,
  updateMemberRole,
  kickMembers,
};
