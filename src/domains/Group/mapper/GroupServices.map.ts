import type { Group, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, GROUP_TYPE, ROLE } from '@/domains/Group';
import {
  normalizeResourceActions,
  resourceActionsToApiKeys,
  TAG_RESOURCE_ACTION,
  type TagResourceAction,
} from '@/domains/Tag';
import type { EnumKey } from '@/utils/enum';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  AddGroupApiRequest,
  ChangeGroupConfigApiRequest,
  FetchGroupMembersApiResponse,
  GetGroupConfigApiRequest,
  GetGroupConfigApiResponse,
  GetGroupInfoApiRequest,
  GroupRoleApiResponse,
  ListGroupApiRequest,
  ListGroupApiResponse,
  ListMemberApiRequest,
} from '../apis/GroupApi.type';
import type {
  CreateGroupRequest,
  FetchGroupListRequest,
  UpdateGroupResConfigRequest,
} from '../service/index.type';
import { mapGroupMemberRawResponse } from './groupMember.mapper';

type GroupRaw = Partial<Group> & {
  groupId?: string | number;
  createTime?: number | string | null;
};

const mapRequiredTextFromApi = (value: unknown): string => String(value ?? '');

const mapGroupFromApi = (raw: GroupRaw): Group => {
  const group: Group = {
    groupId: normalizeId(raw.groupId),
    // fallback：旧小组接口可能缺少必填展示字段，mapper 统一补齐为空文本。
    groupName: mapRequiredTextFromApi(raw.groupName),
    groupDesc: mapRequiredTextFromApi(raw.groupDesc),
    groupCoverUrl: mapRequiredTextFromApi(raw.groupCoverUrl),
    // fallback：旧小组接口缺少 groupType 时按普通组处理。
    groupType: typeof raw.groupType === 'number' ? raw.groupType : GROUP_TYPE.NORMAL,
    // fallback：旧小组接口缺少 memberCount 时按 0 展示。
    memberCount: Number(raw.memberCount) || 0,
    createTime: formatTimestampToDate(raw.createTime),
  };
  group.ownerId = raw.ownerId;
  group.ownerInfo = raw.ownerInfo;
  group.inviteCode = raw.inviteCode;
  group.tokenUsed = raw.tokenUsed;
  group.tokenBalance = raw.tokenBalance;
  return group;
};

const mapTagResourceActionFromApi = (value: unknown): TagResourceAction | undefined => {
  if (typeof value === 'number' && TAG_RESOURCE_ACTION.getKey(value) != null) {
    return value as TagResourceAction;
  }
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const numericValue = Number(text);
  // fallback：兼容旧接口把动作枚举序列化成数字字符串
  if (Number.isInteger(numericValue) && TAG_RESOURCE_ACTION.getKey(numericValue) != null) {
    return numericValue as TagResourceAction;
  }
  let action: TagResourceAction | undefined;
  for (const item of TAG_RESOURCE_ACTION.options) {
    if (item.key !== text.toUpperCase()) continue;
    action = item.value as TagResourceAction;
    break;
  }
  // fallback：兼容旧接口把动作枚举序列化成枚举名
  if (action != null && TAG_RESOURCE_ACTION.getKey(action) != null) {
    return action as TagResourceAction;
  }
  return undefined;
};

const mapDefaultMemberActionsFromApi = (actions?: unknown[]): TagResourceAction[] => {
  const normalized: TagResourceAction[] = [];
  // fallback：缺失 defaultMemberActions 时按空权限处理
  for (const action of actions ?? []) {
    const mapped = mapTagResourceActionFromApi(action);
    if (mapped == null) continue;
    normalized.push(mapped);
  }
  return normalizeResourceActions(normalized);
};

const mapFetchGroupListRequest = (params: FetchGroupListRequest): ListGroupApiRequest => ({
  groupRoleFilter: params.groupRoleFilter,
  page: params.page,
  size: params.size,
});

const mapFetchGroupListFromApi = (
  data: ListGroupApiResponse
): { groups: Group[]; total: number } => {
  const groups: Group[] = [];
  for (const item of data.list) {
    groups.push(mapGroupFromApi(item as unknown as GroupRaw));
  }
  return {
    groups,
    total: Number(data.total) || 0,
  };
};

const mapFetchGroupInfoFromApi = (data: Group): Group =>
  mapGroupFromApi(data as unknown as GroupRaw);

const mapFetchGroupInfoRequest = (groupId: string): GetGroupInfoApiRequest => ({
  groupId,
});

const mapGroupWalletInfoFromApi = (data: Group): number => {
  // fallback：小组详情旧数据可能没有 tokenBalance
  return data.tokenBalance ?? 0;
};

const mapFetchGroupResConfigFromApi = (
  data: GetGroupConfigApiResponse,
  fallbackGroupId: string
): GroupResConfig | null => {
  return {
    // fallback：配置接口可能省略 groupId，此时使用请求入参
    groupId: normalizeId(data.groupId ?? fallbackGroupId),
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

const mapCreateGroupRequest = (params: CreateGroupRequest): AddGroupApiRequest => {
  return {
    groupName: params.groupName,
    groupType: params.groupType,
    groupDesc: params.groupDesc,
    groupCoverUrl: params.groupCoverUrl,
  };
};

const mapCreateGroupFromApi = (data: string | number): string => normalizeId(data);

const mapFetchGroupMembersRequest = (
  groupId: string | number,
  page: number,
  size: number
): ListMemberApiRequest => ({
  groupId,
  page,
  size,
});

const mapFetchGroupMembersFromApi = (data: FetchGroupMembersApiResponse): GroupMemberList => {
  const members: GroupMemberList['members'] = [];
  for (const item of data.list) {
    members.push(mapGroupMemberRawResponse(item));
  }
  return {
    members,
    total: Number(data.total) || 0,
  };
};

const mapFetchMyRoleInGroupRequest = (groupId: string): string => groupId;

const mapFetchMyRoleInGroupFromApi = (
  data: number | GroupRoleApiResponse
): EnumKey<typeof ROLE> | null => {
  let roleNum: number;
  if (typeof data === 'number') {
    roleNum = data;
  } else {
    roleNum = data.role;
  }
  if (roleNum == null || roleNum < 0) return null;
  // fallback：未知角色值按普通成员处理，保持旧行为
  return ROLE.getKey(roleNum) ?? 'MEMBER';
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
  mapCreateGroupRequest,
  mapCreateGroupFromApi,
  mapFetchGroupMembersRequest,
  mapFetchGroupMembersFromApi,
  mapFetchMyRoleInGroupRequest,
  mapFetchMyRoleInGroupFromApi,
};
