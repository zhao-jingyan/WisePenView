import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toNumberIds } from '@/utils/number';
import type { ApiResponse } from '@/types/api';
import type { UserGroupQuota } from '@/types/quota';
import type { GroupQuotaInfo } from '@/types/quota';
import type { SetGroupQuotaRequest } from './index.type';

const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const res = (await Axios.get('/group/member/getAllGroupToken', {
    params: { page, size: pageSize },
  })) as ApiResponse<{
    total: number;
    list: { groupId?: string; groupName?: string; tokenLimit?: number; tokenUsed?: number }[];
  }>;
  checkResponse(res);
  const list = res.data?.list ?? [];
  const quotas: UserGroupQuota[] = list.map((item) => ({
    groupId: item.groupId ?? '',
    groupName: item.groupName ?? '',
    quotaLimit: item.tokenLimit ?? 0,
    quotaUsed: item.tokenUsed ?? 0,
  }));
  return { quotas, total: res.data?.total ?? 0 };
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const res = (await Axios.get('/group/member/getGroupToken', {
    params: { groupId: toNumberIds(groupId) },
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

export const QuotaServices = {
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
};
