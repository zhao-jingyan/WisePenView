import type {
  GetAllMyGroupTokenInfoApiResponse,
  GetGroupTokenApiResponse,
  GroupTokenInfoApiResponseItem,
} from '@/domains/Group/apis/GroupApi.type';
import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';
import { normalizeId } from '@/utils/normalize/normalizeId';

const toNum = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const mapUserGroupQuotaFromApi = (item: GroupTokenInfoApiResponseItem): UserGroupQuota => {
  const base = item.groupDisplayBase ?? {};
  // fallback：兼容旧接口把小组基础信息平铺在 item 或使用大写字段名
  const rawGroupId = base.groupId ?? base.GroupId ?? item.groupId ?? item.GroupId;

  return {
    groupId: normalizeId(rawGroupId ?? null),
    // fallback：兼容旧接口大写字段名或缺失名称
    groupName: String(base.groupName ?? base.GroupName ?? item.groupName ?? item.GroupName ?? ''),
    // fallback：兼容旧接口大写字段名
    quotaLimit: toNum(item.tokenLimit ?? item.TokenLimit),
    // fallback：兼容旧接口大写字段名
    quotaUsed: toNum(item.tokenUsed ?? item.TokenUsed),
  };
};

const mapFetchUserGroupQuotasFromApi = (
  data: GetAllMyGroupTokenInfoApiResponse
): { quotas: UserGroupQuota[]; total: number } => {
  // fallback：兼容旧分页字段 records
  const rawList = data.list ?? data.records ?? [];
  const quotas = rawList.map(mapUserGroupQuotaFromApi);

  return {
    quotas,
    // fallback：兼容旧接口 Total 字段，缺失时用当前列表长度
    total: toNum(data.total ?? data.Total, quotas.length),
  };
};

const mapFetchGroupQuotaFromApi = (data: GetGroupTokenApiResponse): GroupQuotaInfo => ({
  // fallback：兼容旧接口大写字段名
  used: data.tokenUsed ?? data.TokenUsed ?? 0,
  // fallback：兼容旧接口大写字段名
  limit: data.tokenLimit ?? data.TokenLimit ?? 0,
});

export const QuotaServicesMap = {
  mapFetchUserGroupQuotasFromApi,
  mapFetchGroupQuotaFromApi,
};
