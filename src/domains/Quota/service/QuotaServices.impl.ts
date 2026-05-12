import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { GroupMemberApi } from '../apis/GroupApi';
import type { IQuotaService, SetGroupQuotaRequest } from './index.type';

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** GET /group/member/getAllMyGroupTokenInfo → PageResult<GroupMemberTokenDetailResponse> */
const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const data = (await GroupMemberApi.getAllMyGroupTokenInfo({
    page,
    size: pageSize,
  })) as Record<string, unknown>;
  const rawList = data.list ?? data.records ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  const quotas: UserGroupQuota[] = list
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
    .map((item) => {
      const baseRaw = item.groupDisplayBase;
      const base =
        baseRaw != null && typeof baseRaw === 'object' ? (baseRaw as Record<string, unknown>) : {};
      const rawGroupId = base.groupId ?? base.GroupId ?? item.groupId ?? item.GroupId;
      return {
        groupId: normalizeId(
          typeof rawGroupId === 'string' || typeof rawGroupId === 'number' ? rawGroupId : null
        ),
        groupName: String(
          base.groupName ?? base.GroupName ?? item.groupName ?? item.GroupName ?? ''
        ),
        quotaLimit: toNum(item.tokenLimit ?? item.TokenLimit),
        quotaUsed: toNum(item.tokenUsed ?? item.TokenUsed),
      };
    });
  return { quotas, total: toNum(data.total ?? data.Total, quotas.length) };
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const data = await GroupMemberApi.getGroupToken({ groupId });
  return {
    used: data?.TokenUsed ?? 0,
    limit: data?.TokenLimit ?? 0,
  };
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  await GroupMemberApi.changeTokenLimit(params);
};

export const createQuotaServices = (): IQuotaService => ({
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
});
