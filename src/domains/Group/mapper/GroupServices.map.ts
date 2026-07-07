import type { Group, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, ROLE } from '@/domains/Group';
import {
  coerceResourceActions,
  resourceActionsToApiKeys,
  type TagResourceAction,
} from '@/domains/Tag';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import type { EnumKey } from '@/utils/enum';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  AddGroupApiRequest,
  ChangeGroupApiRequest,
  ChangeGroupConfigApiRequest,
  ChangeRoleApiRequest,
  FetchGroupMembersApiResponse,
  GetGroupConfigApiRequest,
  GetGroupConfigApiResponse,
  GetGroupInfoApiRequest,
  GroupApiResponse,
  GroupRoleApiResponse,
  ListGroupApiRequest,
  ListGroupApiResponse,
  ListMemberApiRequest,
} from '../apis/GroupApi.type';
import type {
  CreateGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from '../service/index.type';
import { mapGroupMemberRawResponse } from './groupMember.mapper';

const normalizeNumberFromApi = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const mapGroupTypeFromApi = (value: unknown): number => normalizeNumberFromApi(value);

const mapGroupTypeToApi = (value: number): string => String(value);

const normalizeRoleCodeFromApi = (value: unknown): number | null => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const mapRoleToApi = (value: number): string => String(value);

const mapGroupFromApi = (raw: GroupApiResponse): Group => {
  const ownerInfo = normalizeUserDisplayBaseFromApi(raw.ownerInfo);
  return {
    groupId: normalizeId(raw.groupId),
    groupName: raw.groupName ?? '',
    groupDesc: raw.groupDesc ?? '',
    groupCoverUrl: raw.groupCoverUrl ?? '',
    groupType: mapGroupTypeFromApi(raw.groupType),
    ownerId: raw.ownerId == null ? undefined : normalizeId(raw.ownerId),
    ownerInfo:
      ownerInfo == null
        ? undefined
        : {
            nickname: ownerInfo.nickname ?? '',
            realName: ownerInfo.realName,
            avatar: ownerInfo.avatar,
            identityType: ownerInfo.identityType,
          },
    memberCount: normalizeNumberFromApi(raw.memberCount),
    createTime: formatTimestampToDate(raw.createTime),
    inviteCode: raw.inviteCode ?? undefined,
    tokenUsed: raw.tokenUsed == null ? undefined : normalizeNumberFromApi(raw.tokenUsed),
    tokenBalance: raw.tokenBalance == null ? undefined : normalizeNumberFromApi(raw.tokenBalance),
  };
};

const mapDefaultMemberActionsFromApi = (actions?: unknown[]): TagResourceAction[] =>
  coerceResourceActions(actions);

const mapFetchGroupListRequest = (params: FetchGroupListRequest): ListGroupApiRequest => ({
  groupRoleFilter: params.groupRoleFilter,
  page: params.page,
  size: params.size,
});

const mapFetchGroupListFromApi = (
  data: ListGroupApiResponse
): { groups: Group[]; total: number } => ({
  groups: data.list.map(mapGroupFromApi),
  total: data.total,
});

const mapFetchGroupInfoFromApi = (data: GroupApiResponse): Group => mapGroupFromApi(data);

const mapFetchGroupInfoRequest = (groupId: string): GetGroupInfoApiRequest => ({
  groupId,
});

const mapGroupWalletInfoFromApi = (data: GroupApiResponse): number =>
  normalizeNumberFromApi(data.tokenBalance);

const mapFetchGroupResConfigFromApi = (data: GetGroupConfigApiResponse): GroupResConfig => {
  return {
    groupId: normalizeId(data.groupId),
    fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
    defaultMemberActions: mapDefaultMemberActionsFromApi(data.defaultMemberActions),
  };
};

const mapFetchGroupResConfigRequest = (groupId: string): GetGroupConfigApiRequest => ({
  groupId,
});

const mapUpdateGroupResConfigRequest = (
  params: UpdateGroupResConfigRequest
): ChangeGroupConfigApiRequest => ({
  groupId: params.groupId,
  fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
  defaultMemberActions: resourceActionsToApiKeys(params.defaultMemberActions),
});

const mapCreateGroupFromApi = (data: string | number): string => normalizeId(data);

const mapCreateGroupRequest = (
  params: Omit<CreateGroupRequest, 'defaultMemberActions'>
): AddGroupApiRequest => ({
  ...params,
  groupType: mapGroupTypeToApi(params.groupType),
});

const mapEditGroupRequest = (params: EditGroupRequest): ChangeGroupApiRequest => ({
  ...params,
  groupType: mapGroupTypeToApi(params.groupType),
});

const mapUpdateMemberRoleRequest = (params: UpdateMemberRoleRequest): ChangeRoleApiRequest => ({
  ...params,
  role: mapRoleToApi(params.role),
});

const mapFetchGroupMembersRequest = (
  groupId: string | number,
  page: number,
  size: number
): ListMemberApiRequest => ({
  groupId,
  page,
  size,
});

const mapFetchGroupMembersFromApi = (data: FetchGroupMembersApiResponse): GroupMemberList => ({
  members: data.list.map(mapGroupMemberRawResponse),
  total: data.total,
});

const mapFetchMyRoleInGroupRequest = (groupId: string): string => groupId;

const mapFetchMyRoleInGroupFromApi = (data: GroupRoleApiResponse): EnumKey<typeof ROLE> | null => {
  const roleNum = normalizeRoleCodeFromApi(data);
  if (roleNum == null || roleNum < 0) return null;
  return ROLE.getKey(roleNum) ?? null;
};

export const GroupServicesMap = {
  mapFetchGroupListRequest,
  mapFetchGroupListFromApi,
  mapFetchGroupInfoFromApi,
  mapFetchGroupInfoRequest,
  mapGroupWalletInfoFromApi,
  mapFetchGroupResConfigFromApi,
  mapFetchGroupResConfigRequest,
  mapUpdateGroupResConfigRequest,
  mapCreateGroupFromApi,
  mapCreateGroupRequest,
  mapEditGroupRequest,
  mapUpdateMemberRoleRequest,
  mapFetchGroupMembersRequest,
  mapFetchGroupMembersFromApi,
  mapFetchMyRoleInGroupRequest,
  mapFetchMyRoleInGroupFromApi,
};
