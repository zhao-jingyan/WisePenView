import type { UserGroupQuota, GroupQuotaInfo } from '@/types/quota';

/** QuotaService 接口：供依赖注入使用 */
export interface IQuotaService {
  fetchUserGroupQuotas(
    page: number,
    pageSize: number
  ): Promise<{ quotas: UserGroupQuota[]; total: number }>;
  fetchGroupQuota(groupId: string | number): Promise<GroupQuotaInfo>;
  setGroupQuota(params: SetGroupQuotaRequest): Promise<void>;
}

/** 设置成员配额请求参数（与 OpenAPI changeTokenLimit 对齐）；ID 用 string 避免大数精度丢失 */
export interface SetGroupQuotaRequest {
  groupId: string;
  targetUserIds: string[];
  newTokenLimit: number;
}
