import { GroupMemberApi } from '@/domains/Group/apis/GroupApi';
import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';
import { QuotaServicesMap } from '../mapper/QuotaServices.map';
import type { IQuotaService, SetGroupQuotaRequest } from './index.type';

/** GET /group/member/getAllMyGroupTokenInfo → PageResult<GroupMemberTokenDetailResponse> */
const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const data = await GroupMemberApi.getAllMyGroupTokenInfo({
    page,
    size: pageSize,
  });
  return QuotaServicesMap.mapFetchUserGroupQuotasFromApi(data);
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const data = await GroupMemberApi.getGroupToken({ groupId });
  return QuotaServicesMap.mapFetchGroupQuotaFromApi(data);
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  await GroupMemberApi.changeTokenLimit(params);
};

export const createQuotaServices = (): IQuotaService => ({
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
});
