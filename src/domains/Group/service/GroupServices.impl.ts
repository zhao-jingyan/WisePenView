import type { Group, GroupMemberList, GroupResConfig, ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { GroupApi, GroupMemberApi, GroupResConfigApi } from '../apis/GroupApi';
import { GroupServicesMap } from '../mapper/GroupServices.map';
import type {
  CreateGroupRequest,
  DeleteGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  GetGroupWalletInfoRequest,
  IGroupService,
  JoinGroupRequest,
  KickMembersRequest,
  QuitGroupRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from './index.type';

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const query = GroupServicesMap.mapFetchGroupListRequest(params);
  const payload = await GroupApi.list(query);
  return GroupServicesMap.mapFetchGroupListFromApi(payload);
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const myRole = await fetchMyRoleInGroup(groupId);
  const query = GroupServicesMap.mapFetchGroupInfoRequest(groupId);
  const data = await (myRole === 'MEMBER'
    ? GroupApi.getGroupBaseInfo(query)
    : GroupApi.getGroupDetailInfo(query));
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return GroupServicesMap.mapFetchGroupInfoFromApi(data);
};

const getGroupWalletInfo = async (params: GetGroupWalletInfoRequest): Promise<number> => {
  const { groupId } = params;
  if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
  const data = await GroupApi.getGroupDetailInfo({ groupId });
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_WALLET_FETCH_FAILED);
  return GroupServicesMap.mapGroupWalletInfoFromApi(data);
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  const query = GroupServicesMap.mapFetchGroupResConfigRequest(groupId);
  const data = await GroupResConfigApi.getConfig(query);
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_RES_CONFIG_FETCH_FAILED);
  const config = GroupServicesMap.mapFetchGroupResConfigFromApi(data, groupId);
  if (!config) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_RES_CONFIG_INVALID);
  }
  return config;
};

const updateGroupResConfig = async (params: UpdateGroupResConfigRequest) => {
  const payload = GroupServicesMap.mapUpdateGroupResConfigRequest(params);
  await GroupResConfigApi.changeConfig(payload);
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  const payload = await GroupApi.addGroup(params);
  if (payload == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
  }
  const groupId = GroupServicesMap.mapCreateGroupFromApi(payload);
  if (!groupId) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
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
  const query = GroupServicesMap.mapFetchGroupMembersRequest(groupId, page, size);
  const data = await GroupMemberApi.list(query);
  if (!data) {
    return { members: [], total: 0 };
  }
  return GroupServicesMap.mapFetchGroupMembersFromApi(data);
};

const fetchMyRoleInGroup = async (groupId: string): Promise<EnumKey<typeof ROLE>> => {
  const query = GroupServicesMap.mapFetchMyRoleInGroupRequest(groupId);
  const data = await GroupMemberApi.getMyRole(query);
  const role = GroupServicesMap.mapFetchMyRoleInGroupFromApi(data);
  if (!role) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ROLE_FETCH_FAILED);
  }
  return role;
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
