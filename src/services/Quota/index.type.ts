/** 设置成员配额请求参数（与 OpenAPI changeTokenLimit 对齐） */
export interface SetGroupQuotaRequest {
  groupId: number;
  targetUserIds: number[];
  newTokenLimit: number;
}
