import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';

export interface FetchUserGroupQuotasResponse {
  list: UserGroupQuota[];
  total: number;
}

/** QuotaService 接口：供依赖注入使用 */
export interface IQuotaService {
  fetchUserGroupQuotas(page: number, pageSize: number): Promise<FetchUserGroupQuotasResponse>;
  fetchGroupQuota(groupId: string | number): Promise<GroupQuotaInfo>;
  setGroupQuota(params: SetGroupQuotaRequest): Promise<void>;
}

/** 设置成员配额请求参数（与 OpenAPI changeTokenLimit 对齐）；ID 用 string 避免大数精度丢失 */
export interface SetGroupQuotaRequest {
  groupId: string;
  targetUserIds: string[];
  newTokenLimit: number;
}
