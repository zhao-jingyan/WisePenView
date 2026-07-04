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
import type { FetchGroupListRequest, UpdateGroupResConfigRequest } from '../service/index.type';
import { mapGroupMemberRawResponse } from './groupMember.mapper';

type GroupRaw = Partial<Group> & {
  groupId?: string | number;
  createTime?: number | string | null;
};

const mapRequiredTextFromApi = (value: unknown): string => String(value ?? '');

const mapGroupFromApi = (raw: GroupRaw): Group =>
  ({
    ...raw,
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
  }) as Group;

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
  const action = TAG_RESOURCE_ACTION.options.find((item) => item.key === text.toUpperCase())?.value;
  // fallback：兼容旧接口把动作枚举序列化成枚举名
  return action != null && TAG_RESOURCE_ACTION.getKey(action) != null
    ? (action as TagResourceAction)
    : undefined;
};

const mapDefaultMemberActionsFromApi = (actions?: unknown[]): TagResourceAction[] =>
  normalizeResourceActions(
    // fallback：缺失 defaultMemberActions 时按空权限处理
    (actions ?? [])
      .map(mapTagResourceActionFromApi)
      .filter((value): value is TagResourceAction => value != null)
  );

const mapFetchGroupListRequest = (params: FetchGroupListRequest): ListGroupApiRequest => ({
  groupRoleFilter: params.groupRoleFilter,
  page: params.page,
  size: params.size,
});

const mapFetchGroupListFromApi = (
  data: ListGroupApiResponse
): { groups: Group[]; total: number } => ({
  groups: data.list.map((item) => mapGroupFromApi(item as unknown as GroupRaw)),
  total: Number(data.total) || 0,
});

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

const mapFetchGroupMembersFromApi = (data: FetchGroupMembersApiResponse): GroupMemberList => ({
  members: data.list.map(mapGroupMemberRawResponse),
  total: Number(data.total) || 0,
});

const mapFetchMyRoleInGroupRequest = (groupId: string): string => groupId;

const mapFetchMyRoleInGroupFromApi = (
  data: number | GroupRoleApiResponse
): EnumKey<typeof ROLE> | null => {
  const roleNum = typeof data === 'number' ? data : data.role;
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
  mapCreateGroupFromApi,
  mapFetchGroupMembersRequest,
  mapFetchGroupMembersFromApi,
  mapFetchMyRoleInGroupRequest,
  mapFetchMyRoleInGroupFromApi,
};
