import type { IQuotaService } from '@/domains/Quota';
import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const userGroupQuotas = mockdata.userGroupQuotas as UserGroupQuota[];
const groupQuotaInfo = mockdata.groupQuotaInfo as GroupQuotaInfo;

const fetchUserGroupQuotas = async (
  _page: number,
  _pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  await delay(200);
  return { quotas: userGroupQuotas, total: userGroupQuotas.length };
};

const fetchGroupQuota = async (_groupId: string | number): Promise<GroupQuotaInfo> => {
  await delay(200);
  return groupQuotaInfo;
};

const setGroupQuota = async (): Promise<void> => {
  await delay(150);
};

export const QuotaServicesMock: IQuotaService = {
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
};
