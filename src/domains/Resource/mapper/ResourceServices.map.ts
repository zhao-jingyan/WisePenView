import type { ResourceItem, ResourceTagBind } from '@/domains/Resource';
import type { GetUserInteractionRecordApiResponse } from '../apis/InteractApi.type';
import type {
  ChangeResourceActionPermissionApiRequest,
  GlobalSearchApiResponse,
  ListResourceItemsApiRequest,
  ResourceListPageApiResponse,
} from '../apis/ResourceApi.type';
import {
  normalizeSearchResourceType,
  resourceActionsToApiKeys,
  TAG_QUERY_LOGIC_MODE,
  type ResourceActionKey,
} from '../enum';
import type {
  GetUserResourcesRequest,
  ResourceListPage,
  SearchHitItem,
  SearchResultPage,
  UpdateResourceActionPermissionRequest,
} from '../service/index.type';
import { resolveResourceIconType } from '../utils/resolveResourceIconType';

const PERSONAL_GROUP_PREFIX = 'p_';

/** 后端 ResourceItemResponse 中的嵌套互动统计结构 */
interface RawInteractionInfo {
  readCount?: number | string | null;
  likeCount?: number | string | null;
  scoreCount?: number | string | null;
  scoreTotal?: number | string | null;
}

interface MapResourceItemContext {
  groupId?: string;
}

/**
 * 将后端 ResourceItemResponse 原始数据归一化为前端 ResourceItem
 */
export function normalizeResourceItem<T extends Partial<ResourceItem> | null | undefined>(
  raw: T
): T {
  if (raw == null) return raw;
  const next: Partial<ResourceItem> = { ...raw };

  const interactionInfo = (raw as unknown as { resourceInteractionInfo?: RawInteractionInfo })
    .resourceInteractionInfo;

  if (interactionInfo) {
    next.readCount =
      interactionInfo.readCount != null ? Number(interactionInfo.readCount) : undefined;
    next.likeCount =
      interactionInfo.likeCount != null ? Number(interactionInfo.likeCount) : undefined;
    const scoreCount = interactionInfo.scoreCount != null ? Number(interactionInfo.scoreCount) : 0;
    const scoreTotal = interactionInfo.scoreTotal != null ? Number(interactionInfo.scoreTotal) : 0;
    next.scoreAvg = scoreCount > 0 ? scoreTotal / scoreCount : null;
  }

  return next as T;
}

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
    // fallback：未传时与 OpenAPI 默认 OR 一致
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
  return binds.find((bind) => bind.groupId?.startsWith(PERSONAL_GROUP_PREFIX)) ?? binds[0];
};

const mapTagsToCurrentTags = (
  tags: ResourceTagBind['tags']
): Record<string, string> | undefined => {
  if (!tags || typeof tags !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(tags).map(([tagId, tagInfo]) => [tagId, resolveTagName(tagInfo)])
  );
};

/** 单条资源：Java Long 字符串、标签派生字段 */
const mapResourceItemFromApi = (
  raw: ResourceItem,
  context: MapResourceItemContext = {}
): ResourceItem => {
  const item = normalizeResourceItem(raw) as ResourceItem;
  const currentTagBind = resolveCurrentTagBind(item, context);
  const tagsFromBind = mapTagsToCurrentTags(currentTagBind?.tags);
  const fallbackCurrentTags =
    item.currentTags && !Array.isArray(item.currentTags) ? item.currentTags : undefined;
  const currentTags = tagsFromBind ?? fallbackCurrentTags;
  const tagIds = Object.keys(currentTags ?? {});
  const mainTagId = currentTagBind?.primaryTagId ?? tagIds[0];

  return {
    ...item,
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

const mapChangeResourceActionPermissionRequest = (
  params: UpdateResourceActionPermissionRequest
): ChangeResourceActionPermissionApiRequest => {
  return {
    resourceId: params.resourceId,
    overrideGrantedActions: resourceActionsToApiKeys(params.overrideGrantedActions),
    specifiedUsersGrantedActions: mapSpecifiedUsersGrantedActionsToApi(
      params.specifiedUsersGrantedActions
    ),
  };
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
const mapInteractStatsFromApi = (resourceInfo: ResourceItem): ResourceInteractStats => {
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

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapResourceListPageFromApi,
  mapChangeResourceActionPermissionRequest,
  mapLikeStatusFromApi,
  mapRateFromApi,
  mapInteractStatsFromApi,
  mapSearchResultPageFromApi,
};
