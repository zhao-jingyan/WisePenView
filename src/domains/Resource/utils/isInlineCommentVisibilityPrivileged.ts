import type { ResourceAccessRole } from '../entity/resource';

/** 笔记所有者或组内管理员/组长可配置批注可见性，且在 own_only 下豁免过滤 */
export function isInlineCommentVisibilityPrivileged(role?: ResourceAccessRole | null): boolean {
  return role === 'OWNER' || role === 'GROUP_ADMIN';
}
