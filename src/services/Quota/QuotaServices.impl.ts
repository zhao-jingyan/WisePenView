import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toIdString } from '@/utils/number';
import type { ApiResponse } from '@/types/api';
import type { UserGroupQuota } from '@/types/quota';
import type { GroupQuotaInfo } from '@/types/quota';
import type { SetGroupQuotaRequest } from './index.type';
import type { IQuotaService } from './index.type';

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** GET /group/member/getAllMyGroupTokenInfo → PageResult<GroupMemberTokenDetailResponse> */
const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const res = (await Axios.get('/group/member/getAllMyGroupTokenInfo', {
    params: { page, size: pageSize },
  })) as ApiResponse<Record<string, unknown>>;
  checkResponse(res);
  const data = (res.data ?? {}) as Record<string, unknown>;
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
        groupId: toIdString(
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
  const res = (await Axios.get('/group/member/getGroupToken', {
    params: { groupId },
  })) as ApiResponse<{ TokenUsed?: number; TokenLimit?: number }>;
  checkResponse(res);
  const data = res.data;
  return {
    used: data?.TokenUsed ?? 0,
    limit: data?.TokenLimit ?? 0,
  };
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  const res = (await Axios.post('/group/member/changeTokenLimit', params)) as ApiResponse;
  checkResponse(res);
};

export const createQuotaServices = (): IQuotaService => ({
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
});
