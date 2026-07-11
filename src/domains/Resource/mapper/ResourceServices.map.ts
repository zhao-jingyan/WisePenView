import type { ResourceItem, ResourceTagBind } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type { GetUserInteractionRecordApiResponse } from '../apis/InteractApi.type';
import type {
  AddInlineCommentItemApiRequest,
  ChangeResourceActionPermissionApiRequest,
  CreateInlineCommentApiRequest,
  GlobalSearchApiResponse,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  ListResourceItemsApiRequest,
  ResourceActionApiList,
  ResourceGroupDisplayBaseApiResponse,
  ResourceGroupGrantedActionsApiResponse,
  ResourceInlineCommentApiResponse,
  ResourceInlineCommentItemApiResponse,
  ResourceInteractionInfoApiResponse,
  ResourceItemApiResponse,
  ResourceListPageApiResponse,
  ResourceSpecifiedUserGrantedActionsApiResponse,
  UpdateInlineCommentItemApiRequest,
} from '../apis/ResourceApi.type';
import {
  coerceResourceActions,
  filterSupportedResourcePermissionActions,
  getSupportedResourcePermissionActions,
  normalizeResourceActions,
  normalizeSearchResourceType,
  RESOURCE_ACTION,
  RESOURCE_PERMISSION_ACTION_ORDER,
  resourceActionsToApiKeys,
  TAG_QUERY_LOGIC_MODE,
  type ResourceAction,
  type ResourceActionKey,
} from '../enum';
import type {
  AddInlineCommentItemRequest,
  CreateInlineCommentRequest,
  GetUserResourcesRequest,
  ResourceInlineCommentAuthorInfo,
  ResourceInlineCommentThread,
  ResourceListPage,
  ResourcePermissionActionOption,
  ResourcePermissionOverview,
  ResourcePermissionSubject,
  SearchHitItem,
  SearchResultPage,
  UpdateInlineCommentItemRequest,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
} from '../service/index.type';
import { resolveResourceIconType } from '../utils/resolveResourceIconType';

const PERSONAL_GROUP_PREFIX = 'p_';
const isPersonalGroupId = (groupId?: string): boolean =>
  groupId?.startsWith(PERSONAL_GROUP_PREFIX) ?? false;

type ResourceItemNumericField = 'size' | 'readCount' | 'likeCount' | 'scoreAvg';
type ResourceItemApiSize = ResourceItemApiResponse['size'];
type ResourceItemApiOwnerInfo = ResourceItemApiResponse['ownerInfo'];
type ResourceItemRawOwnerInfo = ResourceItem['ownerInfo'] | ResourceItemApiOwnerInfo;
type ResourceItemRawTagBinds = ResourceItem['tagBinds'] | ResourceItemApiResponse['tagBinds'];
type ResourceActionsBySubject = Record<string, unknown[] | null | undefined>;
type NormalizedResourceActionsBySubject = Record<
  string,
  ResourceAction[] | ResourceActionApiList | null | undefined
>;
type ResourceItemRawActionFields = {
  currentActions?: ResourceAction[] | ResourceActionApiList | null;
  overrideGrantedActions?:
    ResourceGroupGrantedActionsApiResponse[] | NormalizedResourceActionsBySubject | null;
  specifiedUsersGrantedActions?:
    ResourceSpecifiedUserGrantedActionsApiResponse[] | NormalizedResourceActionsBySubject | null;
};
type ResourcePermissionActionField =
  | ResourceGroupGrantedActionsApiResponse[]
  | ResourceSpecifiedUserGrantedActionsApiResponse[]
  | ResourceActionsBySubject
  | null
  | undefined;
type NormalizedResourceActionFields = {
  currentActions?: ResourceAction[] | null;
  overrideGrantedActions?: Record<string, ResourceAction[]> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null;
};

type NormalizableResourceItem = Omit<
  Partial<ResourceItem>,
  | ResourceItemNumericField
  | 'ownerInfo'
  | 'tagBinds'
  | 'currentActions'
  | 'overrideGrantedActions'
  | 'specifiedUsersGrantedActions'
> &
  Omit<
    Partial<ResourceItemApiResponse>,
    | ResourceItemNumericField
    | 'ownerInfo'
    | 'tagBinds'
    | 'currentActions'
    | 'overrideGrantedActions'
    | 'specifiedUsersGrantedActions'
  > & {
    size?: ResourceItemApiSize;
    readCount?: number | null;
    likeCount?: number | null;
    scoreAvg?: number | null;
    ownerInfo?: ResourceItemRawOwnerInfo;
    tagBinds?: ResourceItemRawTagBinds;
    resourceInteractionInfo?: ResourceInteractionInfoApiResponse;
  } & ResourceItemRawActionFields;

type NormalizedResourceItem<T extends NormalizableResourceItem> = Omit<
  T,
  ResourceItemNumericField | keyof ResourceItemRawActionFields
> &
  Partial<Pick<ResourceItem, ResourceItemNumericField>> &
  NormalizedResourceActionFields;

interface MapResourceItemContext {
  groupId?: string;
}

/**
 * 将后端 ResourceItemResponse 原始数据归一化为前端 ResourceItem
 */
export function normalizeResourceItem<T extends null | undefined>(raw: T): T;
export function normalizeResourceItem<T extends NormalizableResourceItem>(
  raw: T
): NormalizedResourceItem<T>;
export function normalizeResourceItem(
  raw: NormalizableResourceItem | null | undefined
): NormalizedResourceItem<NormalizableResourceItem> | null | undefined {
  if (raw == null) return raw;
  const {
    currentActions: rawCurrentActions,
    overrideGrantedActions: rawOverrideGrantedActions,
    specifiedUsersGrantedActions: rawSpecifiedUsersGrantedActions,
    ...rawRest
  } = raw;
  const next: NormalizedResourceItem<NormalizableResourceItem> = {
    ...rawRest,
    // 后端 resourceInfo.size 当前以字符串返回，前端统一归一化为 number。
    size: normalizeResourceSize(raw.size),
    readCount: raw.readCount,
    likeCount: raw.likeCount,
    scoreAvg: raw.scoreAvg,
  };

  const interactionInfo = raw.resourceInteractionInfo;

  if (interactionInfo) {
    next.readCount = interactionInfo.readCount;
    next.likeCount = interactionInfo.likeCount;
    const scoreCount = interactionInfo.scoreCount ?? 0;
    const scoreTotal = interactionInfo.scoreTotal ?? 0;
    next.scoreAvg = scoreCount > 0 ? scoreTotal / scoreCount : null;
  }

  next.currentActions = coerceResourceActions(rawCurrentActions as unknown[] | null | undefined);
  next.overrideGrantedActions = normalizeResourceActionMap(rawOverrideGrantedActions);
  next.specifiedUsersGrantedActions = normalizeResourceActionMap(rawSpecifiedUsersGrantedActions);

  return next;
}

const normalizeResourceSize = (value: ResourceItemApiSize): number | undefined => {
  if (value == null) return undefined;
  const size = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(size) && size >= 0 ? size : undefined;
};

/** Service 入参 → GET /resource/item/listResources query */
const mapListResourceItemsRequest = (
  params: GetUserResourcesRequest,
  overrides: Partial<ListResourceItemsApiRequest> = {}
): ListResourceItemsApiRequest => {
  const resourceType = params.resourceType;
  const tagIds = params.tagIds;
  const hasResourceType = resourceType != null && resourceType !== '';
  const hasTagIds = tagIds != null && tagIds.length > 0;

  return {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    // 未传时显式使用 OpenAPI 默认 OR。
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    // 不传 resourceType：空串会被后端当作有效筛选值
    ...(hasResourceType ? { resourceType } : {}),
    // 不传 tagIds：空数组仍会触发按标签过滤
    ...(hasTagIds ? { tagIds } : {}),
    // 小组列表等场景由 Service 注入 groupId 等覆盖项
    ...overrides,
  };
};

const resolveTagName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'tagName' in value) {
    const tagName = (value as { tagName?: unknown }).tagName;
    if (typeof tagName === 'string') return tagName;
  }
  return '';
};

const resolveCurrentTagBind = (
  item: ResourceItem,
  context: MapResourceItemContext
): ResourceTagBind | undefined => {
  const binds = item.tagBinds ?? [];
  if (binds.length === 0) return undefined;
  if (context.groupId) {
    return binds.find((bind) => bind.groupId === context.groupId) ?? binds[0];
  }
  return binds.find((bind) => isPersonalGroupId(bind.groupId)) ?? binds[0];
};

const mapTagsToCurrentTags = (
  tags: ResourceTagBind['tags']
): Record<string, string> | undefined => {
  if (!tags || typeof tags !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(tags).map(([tagId, tagInfo]) => [tagId, resolveTagName(tagInfo)])
  );
};

const normalizeOwnerInfo = (
  ownerInfo: ResourceItemRawOwnerInfo | undefined
): ResourceItem['ownerInfo'] | undefined => {
  if (ownerInfo == null) return undefined;
  return normalizeUserDisplayBaseFromApi(ownerInfo as ResourceItemApiOwnerInfo);
};

const resolveUserDisplayName = (
  userInfo: UserDisplayBase | undefined,
  fallbackId: string
): string =>
  userInfo?.realName?.trim() ||
  userInfo?.nickname?.trim() ||
  (fallbackId ? `用户 ${fallbackId}` : '用户');

const resolveGroupDisplayName = (
  groupInfo: ResourceGroupDisplayBaseApiResponse | undefined,
  fallbackId: string
): string => groupInfo?.groupName?.trim() || (fallbackId ? `小组 ${fallbackId}` : '小组');

const resolveGroupMemberSubjectName = (
  groupId: string,
  groupInfo?: ResourceGroupDisplayBaseApiResponse
): string => `${resolveGroupDisplayName(groupInfo, groupId)} 的成员`;

const isGrantedActionListItem = (
  value: unknown
): value is
  ResourceGroupGrantedActionsApiResponse | ResourceSpecifiedUserGrantedActionsApiResponse =>
  value != null && typeof value === 'object' && 'grantedActions' in value;

const getGrantedActionSubjectId = (
  item: ResourceGroupGrantedActionsApiResponse | ResourceSpecifiedUserGrantedActionsApiResponse
): string => {
  if ('groupId' in item) return normalizeId(item.groupId);
  return normalizeId(item.userId);
};

const mapOverrideGroupInfoByIdFromApi = (
  value: NormalizableResourceItem['overrideGrantedActions']
): Record<string, ResourceGroupDisplayBaseApiResponse> => {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map((item) => {
        const groupId = normalizeId(item.groupId);
        return groupId && item.groupInfo ? ([groupId, item.groupInfo] as const) : null;
      })
      .filter((entry): entry is readonly [string, ResourceGroupDisplayBaseApiResponse] =>
        Boolean(entry)
      )
  );
};

const mapSpecifiedUserInfoByIdFromApi = (
  value: NormalizableResourceItem['specifiedUsersGrantedActions']
): Record<string, UserDisplayBase> => {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map((item) => {
        const userId = normalizeId(item.userId);
        const userInfo = normalizeUserDisplayBaseFromApi(item.userInfo);
        return userId && userInfo ? ([userId, userInfo] as const) : null;
      })
      .filter((entry): entry is readonly [string, UserDisplayBase] => Boolean(entry))
  );
};

/** 单条资源：Java Long 字符串、标签派生字段 */
const mapResourceItemFromApi = (
  raw: NormalizableResourceItem,
  context: MapResourceItemContext = {}
): ResourceItem => {
  const item = normalizeResourceItem(raw) as ResourceItem;
  const currentTagBind = resolveCurrentTagBind(item, context);
  const currentTags = mapTagsToCurrentTags(currentTagBind?.tags);
  const tagIds = Object.keys(currentTags ?? {});
  const mainTagId = currentTagBind?.primaryTagId ?? tagIds[0];
  const ownerInfo = normalizeOwnerInfo(item.ownerInfo) ?? item.ownerInfo;

  return {
    ...item,
    ownerInfo,
    currentTags,
    resourceIconType: resolveResourceIconType({
      resourceType: item.resourceType,
      resourceName: item.resourceName,
    }),
    mainTagId,
    linkTagIds: mainTagId ? tagIds.filter((tagId) => tagId !== mainTagId) : tagIds.slice(1),
  };
};

/** 分页列表 API 响应 → Service 领域分页 */
const mapResourceListPageFromApi = (
  data: ResourceListPageApiResponse,
  context: MapResourceItemContext = {}
): ResourceListPage => {
  const list = data.list.map((item) => mapResourceItemFromApi(item, context));

  return {
    list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.totalPage,
  };
};

/** userId → ResourceAction[] 转为 API 请求的 userId → 枚举 key[]；null/undefined 原样透传 */
const mapSpecifiedUsersGrantedActionsToApi = (
  value: UpdateResourceActionPermissionRequest['specifiedUsersGrantedActions']
): ChangeResourceActionPermissionApiRequest['specifiedUsersGrantedActions'] => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  const byUserId: Record<string, ResourceActionKey[]> = {};
  for (const userId in value) {
    byUserId[userId] = resourceActionsToApiKeys(value[userId]) ?? [];
  }
  return byUserId;
};

/** groupId → ResourceAction[] 转为 API 请求的 groupId → 枚举 key[]；null 表示清空整组覆盖配置。 */
const mapOverrideGrantedActionsToApi = (
  value: UpdateResourceActionPermissionRequest['overrideGrantedActions']
): ChangeResourceActionPermissionApiRequest['overrideGrantedActions'] => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  const byGroupId: Record<string, ResourceActionKey[] | null> = {};
  for (const groupId in value) {
    const actions = value[groupId];
    byGroupId[groupId] = actions === null ? null : (resourceActionsToApiKeys(actions) ?? []);
  }
  return byGroupId;
};

const mapChangeResourceActionPermissionRequest = (
  params: UpdateResourceActionPermissionRequest
): ChangeResourceActionPermissionApiRequest => {
  return {
    resourceId: params.resourceId,
    overrideGrantedActions: mapOverrideGrantedActionsToApi(params.overrideGrantedActions),
    specifiedUsersGrantedActions: mapSpecifiedUsersGrantedActionsToApi(
      params.specifiedUsersGrantedActions
    ),
  };
};

const mapChangeResourceActionPermissionRequestFromSubjects = (
  params: UpdateResourcePermissionSubjectsRequest
): ChangeResourceActionPermissionApiRequest => {
  const overrideGrantedActions: Record<string, ResourceAction[] | null> = {};
  const specifiedUsersGrantedActions: Record<string, ResourceAction[]> = {};

  for (const subject of params.subjects) {
    if (isPersonalGroupId(subject.groupId)) continue;
    if (subject.source === 'tag' && subject.groupId) {
      overrideGrantedActions[subject.groupId] = null;
      continue;
    }
    if (subject.readonly) continue;
    if (subject.source === 'resourceOverride' && subject.groupId) {
      overrideGrantedActions[subject.groupId] = normalizeResourceActions(subject.editableActions);
    }
    if (subject.source === 'specifiedUser' && subject.userId) {
      specifiedUsersGrantedActions[subject.userId] = normalizeResourceActions(
        subject.editableActions
      );
    }
  }

  return mapChangeResourceActionPermissionRequest({
    resourceId: params.resourceId,
    overrideGrantedActions:
      Object.keys(overrideGrantedActions).length > 0 ? overrideGrantedActions : undefined,
    specifiedUsersGrantedActions:
      Object.keys(specifiedUsersGrantedActions).length > 0 ? specifiedUsersGrantedActions : null,
  });
};

const mapPermissionActionOptions = (
  supportedActions: ResourceAction[]
): ResourcePermissionActionOption[] => {
  return supportedActions.map((action) => ({
    action,
    key: RESOURCE_ACTION.getKey(action) ?? String(action),
    label: RESOURCE_ACTION.labels[action] ?? String(action),
    supported: true,
  }));
};

const resolveOwnerName = (ownerInfo: UserDisplayBase | undefined, ownerId?: string): string =>
  ownerInfo?.realName?.trim() || ownerInfo?.nickname?.trim() || ownerId || '所有者';

const mapResourcePermissionOverviewFromResourceItem = (
  raw: NormalizableResourceItem,
  fallbackResourceId: string
): ResourcePermissionOverview => {
  const overrideGroupInfoById = mapOverrideGroupInfoByIdFromApi(raw.overrideGrantedActions);
  const specifiedUserInfoById = mapSpecifiedUserInfoByIdFromApi(raw.specifiedUsersGrantedActions);
  const resourceInfo = normalizeResourceItem(raw);
  const ownerInfo = normalizeOwnerInfo(resourceInfo.ownerInfo);
  const resourceId = resourceInfo.resourceId || fallbackResourceId;
  const supportedActions = getSupportedResourcePermissionActions(resourceInfo.resourceType);
  const actionOptions = mapPermissionActionOptions(supportedActions);
  const ownerActions = filterSupportedResourcePermissionActions(
    RESOURCE_PERMISSION_ACTION_ORDER,
    supportedActions
  );
  const subjects: ResourcePermissionSubject[] = [];
  const owner: ResourcePermissionSubject = {
    id: `owner:${resourceInfo.ownerId || resourceId}`,
    kind: 'owner',
    source: 'owner',
    name: resolveOwnerName(ownerInfo, resourceInfo.ownerId),
    description: '所有者',
    avatar: ownerInfo?.avatar,
    userId: resourceInfo.ownerId,
    effectiveActions: ownerActions,
    editableActions: ownerActions,
    readonly: true,
  };

  subjects.push(owner);

  const overrideGrantedActions = normalizeResourceActionMap(
    resourceInfo.overrideGrantedActions as ResourceActionsBySubject | null | undefined
  );
  const specifiedUsersGrantedActions = normalizeResourceActionMap(
    resourceInfo.specifiedUsersGrantedActions as ResourceActionsBySubject | null | undefined
  );
  const visibleOverrideGrantedActions = Object.fromEntries(
    Object.entries(overrideGrantedActions ?? {}).filter(([groupId]) => !isPersonalGroupId(groupId))
  );
  const overrideGroupIds = new Set(Object.keys(visibleOverrideGrantedActions));
  const primaryTagByGroupId = new Map<string, { tagId?: string }>();

  for (const bind of resourceInfo.tagBinds ?? []) {
    const groupId = bind.groupId;
    if (!groupId || isPersonalGroupId(groupId)) continue;
    primaryTagByGroupId.set(groupId, {
      tagId: bind.primaryTagId,
    });

    if (overrideGroupIds.has(groupId)) continue;
    subjects.push({
      id: `group:${groupId}:tag`,
      kind: 'group',
      source: 'tag',
      name: resolveGroupMemberSubjectName(groupId),
      description: '继承自资源所在标签的权限',
      groupId,
      primaryTagId: bind.primaryTagId,
      effectiveActions: [],
      editableActions: [],
    });
  }

  for (const [groupId, actions] of Object.entries(visibleOverrideGrantedActions)) {
    const filteredActions = filterSupportedResourcePermissionActions(actions, supportedActions);
    const primaryTag = primaryTagByGroupId.get(groupId);
    const groupInfo = overrideGroupInfoById[groupId];
    subjects.push({
      id: `group:${groupId}:override`,
      kind: 'group',
      source: 'resourceOverride',
      name: resolveGroupMemberSubjectName(groupId, groupInfo),
      description: groupInfo?.groupDesc ?? '已覆盖标签策略，仅对此资源生效',
      avatar: groupInfo?.groupCoverUrl ?? undefined,
      groupId,
      primaryTagId: primaryTag?.tagId,
      effectiveActions: filteredActions,
      editableActions: filteredActions,
    });
  }

  for (const [userId, actions] of Object.entries(specifiedUsersGrantedActions ?? {})) {
    const filteredActions = filterSupportedResourcePermissionActions(actions, supportedActions);
    const userInfo = specifiedUserInfoById[userId];
    subjects.push({
      id: `user:${userId}:specified`,
      kind: 'user',
      source: 'specifiedUser',
      name: resolveUserDisplayName(userInfo, userId),
      description: '由您邀请而获得的权限',
      avatar: userInfo?.avatar,
      userId,
      effectiveActions: filteredActions,
      editableActions: filteredActions,
    });
  }

  return {
    resourceId,
    resourceType: resourceInfo.resourceType,
    owner,
    subjects,
    supportedActions,
    actionOptions,
  };
};

const normalizeResourceActionMap = (
  value?: ResourcePermissionActionField
): Record<string, ResourceAction[]> | null => {
  if (value == null) {
    return null;
  }

  // API 响应是携带 groupInfo/userInfo 的列表；内部 ResourceItem/mock 数据可能已是按 subjectId 归一化的 map。
  if (Array.isArray(value)) {
    const entries = value
      .filter(isGrantedActionListItem)
      .map((item) => {
        const subjectId = getGrantedActionSubjectId(item);
        return subjectId
          ? ([subjectId, coerceResourceActions(item.grantedActions)] as const)
          : null;
      })
      .filter((entry): entry is readonly [string, ResourceAction[]] => Boolean(entry));
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  const entries = Object.entries(value).map(([subjectId, actions]) => [
    subjectId,
    coerceResourceActions(actions),
  ]);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

/** 互动记录 API 响应 → 点赞状态；null（未操作）归一化为 false */
const mapLikeStatusFromApi = (
  res: GetUserInteractionRecordApiResponse | null | undefined
): { liked: boolean } => ({
  liked: res?.liked ?? false,
});

/** 互动记录 API 响应 → 评分；null（未评分）归一化为 0 */
const mapRateFromApi = (
  res: GetUserInteractionRecordApiResponse | null | undefined
): { score: number } => ({
  score: res?.score ?? 0,
});

/** 资源互动聚合统计（供互动统计组件展示） */
export interface ResourceInteractStats {
  readCount?: number | null;
  likeCount?: number | null;
  /** mapper 内已完成格式化：有评分则 "X.X 分"，无则 "暂无评分" */
  scoreAvgText: string;
}

/** ResourceItem → 聚合互动统计，供互动统计组件展示 */
const mapInteractStatsFromApi = (resourceInfo: NormalizableResourceItem): ResourceInteractStats => {
  const normalized = normalizeResourceItem(resourceInfo);
  const scoreAvg = normalized.scoreAvg ?? null;
  return {
    readCount: normalized.readCount ?? null,
    likeCount: normalized.likeCount ?? null,
    scoreAvgText: scoreAvg != null ? `${scoreAvg.toFixed(1)} 分` : '暂无评分',
  };
};

// 枚举归一化大小写，下游 === 比较与分组 label 生效
const mapSearchHitFromApi = (raw: GlobalSearchApiResponse['list'][number]): SearchHitItem => ({
  ...raw,
  resourceType: normalizeSearchResourceType(raw.resourceType),
  resourceIconType: resolveResourceIconType({
    resourceType: raw.resourceType,
    resourceName: raw.resourceName,
  }),
});

const mapSearchResultPageFromApi = (data: GlobalSearchApiResponse): SearchResultPage => ({
  list: data.list.map(mapSearchHitFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

function normalizeInlineCommentString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return '';
}

function mapInlineCommentAuthorInfo(
  raw:
    | {
        id?: string | number | null;
        name?: string | null;
        nickname?: string | null;
        realName?: string | null;
        avatar?: string | null;
        avatarUrl?: string | null;
      }
    | null
    | undefined
): ResourceInlineCommentAuthorInfo | undefined {
  if (!raw) {
    return undefined;
  }
  const id = normalizeInlineCommentString(raw.id);
  const name =
    normalizeInlineCommentString(raw.name) ||
    normalizeInlineCommentString(raw.nickname) ||
    normalizeInlineCommentString(raw.realName) ||
    id;
  const avatarUrl =
    normalizeInlineCommentString(raw.avatarUrl) || normalizeInlineCommentString(raw.avatar);
  if (!id && !name && !avatarUrl) {
    return undefined;
  }
  return {
    id,
    name,
    avatarUrl: avatarUrl || '',
  };
}

function inferInlineCommentAnchorKind(
  anchorPayload: Record<string, unknown>
): ResourceInlineCommentThread['anchor']['kind'] {
  if (typeof anchorPayload.inlineIndex === 'number') {
    return 'formula-inline';
  }
  if (typeof anchorPayload.blockId === 'string') {
    return 'formula-block';
  }
  if (Object.keys(anchorPayload).length === 0) {
    return 'unknown';
  }
  return 'text-range';
}

const mapInlineCommentThreadFromApi = (
  raw: ResourceInlineCommentApiResponse
): ResourceInlineCommentThread => {
  const maybeAnchorPayload = raw.anchorRef?.anchorPayload;
  const anchorPayload =
    maybeAnchorPayload && typeof maybeAnchorPayload === 'object' ? maybeAnchorPayload : {};

  return {
    inlineCommentId: normalizeInlineCommentString(raw.inlineCommentId),
    resourceId: normalizeInlineCommentString(raw.resourceId),
    creatorId: normalizeInlineCommentString(raw.creatorId),
    creatorInfo: mapInlineCommentAuthorInfo(raw.creatorInfo),
    resolved: raw.resolved ?? false,
    resolvedBy: normalizeInlineCommentString(raw.resolvedBy) || undefined,
    resolvedByInfo: mapInlineCommentAuthorInfo(raw.resolvedByInfo),
    resolvedAt: normalizeInlineCommentString(raw.resolvedAt) || undefined,
    applicableFromVersion:
      typeof raw.applicableFromVersion === 'number' ? raw.applicableFromVersion : undefined,
    applicableToVersion:
      typeof raw.applicableToVersion === 'number' ? raw.applicableToVersion : undefined,
    createTime: normalizeInlineCommentString(raw.createTime) || undefined,
    updateTime: normalizeInlineCommentString(raw.updateTime) || undefined,
    anchor: {
      externalAnchorId: normalizeInlineCommentString(raw.anchorRef?.externalAnchorId),
      quoteText: normalizeInlineCommentString(raw.anchorRef?.quoteText),
      anchorPayload,
      kind: inferInlineCommentAnchorKind(anchorPayload),
    },
    items: (raw.items ?? []).map((item: ResourceInlineCommentItemApiResponse) => ({
      itemId: normalizeInlineCommentString(item.itemId),
      authorId: normalizeInlineCommentString(item.authorId),
      authorInfo: mapInlineCommentAuthorInfo(item.authorInfo),
      content: item.content ?? '',
      imageUrls: item.imageUrls ?? [],
      mentionUserIds: item.mentionUserIds ?? [],
      createTime: normalizeInlineCommentString(item.createTime) || undefined,
      updateTime: normalizeInlineCommentString(item.updateTime) || undefined,
    })),
  };
};

const mapListInlineCommentsRequest = (params: {
  resourceId: string;
  contentVersion?: number;
  resolved?: boolean;
}): ListInlineCommentsApiRequest => ({
  resourceId: params.resourceId,
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.resolved != null ? { resolved: params.resolved } : {}),
});

const mapListInlineCommentsFromApi = (
  data: ListInlineCommentsApiResponse
): ResourceInlineCommentThread[] =>
  Array.isArray(data) ? data.map(mapInlineCommentThreadFromApi) : [];

const mapIdFieldFromApi = (
  data: unknown,
  fieldName: 'inlineCommentId' | 'itemId'
): string | undefined => {
  if (typeof data === 'string') {
    return data.trim() || undefined;
  }
  if (data && typeof data === 'object') {
    const raw = (data as Record<string, unknown>)[fieldName];
    if (typeof raw === 'string') {
      return raw.trim() || undefined;
    }
  }
  return undefined;
};

const mapInlineCommentThreadIdFromApi = (data: unknown): string | undefined =>
  mapIdFieldFromApi(data, 'inlineCommentId');

const mapInlineCommentItemIdFromApi = (data: unknown): string | undefined =>
  mapIdFieldFromApi(data, 'itemId');

const mapCreateInlineCommentRequest = (
  params: CreateInlineCommentRequest
): CreateInlineCommentApiRequest => ({
  resourceId: params.resourceId,
  externalAnchorId: params.externalAnchorId,
  content: params.content,
  ...(params.quoteText ? { quoteText: params.quoteText } : {}),
  ...(params.anchorPayload ? { anchorPayload: params.anchorPayload } : {}),
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.applicableFromVersion != null
    ? { applicableFromVersion: params.applicableFromVersion }
    : {}),
  ...(params.applicableToVersion != null
    ? { applicableToVersion: params.applicableToVersion }
    : {}),
  ...(params.imageUrls?.length ? { imageUrls: params.imageUrls } : {}),
  ...(params.mentionUserIds?.length ? { mentionUserIds: params.mentionUserIds } : {}),
});

const mapAddInlineCommentItemRequest = (
  params: AddInlineCommentItemRequest
): AddInlineCommentItemApiRequest => ({
  resourceId: params.resourceId,
  inlineCommentId: params.inlineCommentId,
  content: params.content,
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.imageUrls?.length ? { imageUrls: params.imageUrls } : {}),
  ...(params.mentionUserIds?.length ? { mentionUserIds: params.mentionUserIds } : {}),
});

const mapUpdateInlineCommentItemRequest = (
  params: UpdateInlineCommentItemRequest
): UpdateInlineCommentItemApiRequest => ({
  resourceId: params.resourceId,
  inlineCommentId: params.inlineCommentId,
  itemId: params.itemId,
  content: params.content,
  ...(params.contentVersion != null ? { contentVersion: params.contentVersion } : {}),
  ...(params.imageUrls?.length ? { imageUrls: params.imageUrls } : {}),
  ...(params.mentionUserIds?.length ? { mentionUserIds: params.mentionUserIds } : {}),
});

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapResourceListPageFromApi,
  mapResourceItemFromApi,
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromResourceItem,
  mapLikeStatusFromApi,
  mapRateFromApi,
  mapInteractStatsFromApi,
  mapSearchResultPageFromApi,
  mapListInlineCommentsRequest,
  mapListInlineCommentsFromApi,
  mapInlineCommentThreadIdFromApi,
  mapInlineCommentItemIdFromApi,
  mapCreateInlineCommentRequest,
  mapAddInlineCommentItemRequest,
  mapUpdateInlineCommentItemRequest,
};
