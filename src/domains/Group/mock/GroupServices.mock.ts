import type {
  GetGroupWalletInfoRequest,
  Group,
  GroupMember,
  GroupMemberList,
  GroupResConfig,
  IGroupService,
} from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC } from '@/domains/Group';
import { GroupServicesMap } from '@/domains/Group/mapper/GroupServices.map';
import { mapGroupMemberEntityDisplay } from '@/domains/Group/mapper/groupMember.mapper';
import { TAG_RESOURCE_ACTION } from '@/domains/Tag';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const groups = mockdata.groups as Group[];
const groupDetail = mockdata.groupDetail as Group;
const members = mockdata.members as GroupMember[];
const myRole = mockdata.myRole as 'OWNER' | 'ADMIN' | 'MEMBER';

const fetchGroupList = async (): Promise<{ list: Group[]; total: number }> => {
  await delay(200);
  return {
    list: groups.map((group) => GroupServicesMap.mapFetchGroupInfoFromApi(group, group.groupId)),
    total: groups.length,
  };
};

const fetchGroupInfo = async (_groupId: string): Promise<Group> => {
  await delay(200);
  return GroupServicesMap.mapFetchGroupInfoFromApi(groupDetail, groupDetail.groupId);
};

const fetchGroupDetail = async (groupId: string) => {
  await delay(200);
  return {
    group: GroupServicesMap.mapFetchGroupInfoFromApi(groupDetail, groupId),
    currentUserRole: myRole,
    resConfig: await fetchGroupResConfig(groupId),
  };
};

const getGroupWalletInfo = async (_params: GetGroupWalletInfoRequest): Promise<number> => {
  await delay(100);
  return 1000;
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  await delay(100);
  return {
    groupId,
    fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
    defaultMemberActions: [
      TAG_RESOURCE_ACTION.DISCOVER,
      TAG_RESOURCE_ACTION.VIEW,
      TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
    ],
  };
};

const updateGroupResConfig = async (): Promise<void> => {
  await delay(200);
};

const createGroup = async (): Promise<string> => {
  await delay(200);
  return 'mock-new-group-id';
};

const editGroup = async (): Promise<void> => {
  await delay(200);
};

const deleteGroup = async (): Promise<void> => {
  await delay(200);
};

const fetchGroupMembers = async (
  _groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  await delay(200);
  const start = Math.max(0, (page - 1) * size);
  const end = start + size;
  return {
    list: members.slice(start, end).map(mapGroupMemberEntityDisplay),
    total: members.length,
  };
};

const fetchMyRoleInGroup = async (_groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> => {
  await delay(100);
  return myRole;
};

const joinGroup = async (): Promise<void> => {
  await delay(200);
};

const quitGroup = async (): Promise<void> => {
  await delay(200);
};

const updateMemberRole = async (): Promise<void> => {
  await delay(200);
};

const kickMembers = async (): Promise<void> => {
  await delay(200);
};

export const GroupServicesMock: IGroupService = {
  fetchGroupList,
  fetchGroupInfo,
  fetchGroupDetail,
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
};
