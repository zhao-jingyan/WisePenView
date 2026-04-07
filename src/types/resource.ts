import type { UserDisplayBase } from './user';
/**
 * Resource 领域模型
 * path 与 tags：path 为路径/文件夹归属；currentTags 与 docs/apis/resource.openapi.json ResourceItemResponse 字段一致
 */

/** 资源项（与 OpenAPI ResourceItemResponse 字段一致） */
export interface ResourceItem {
  resourceId: string;
  resourceName: string;
  ownerInfo: UserDisplayBase;
  resourceType?: string;
  preview?: string;
  size?: number;
  /** 归属路径（文件夹），如 '/' 或 '/documents/notes' */
  path?: string;
  /** 当前标签映射（tagId → tagName），与接口返回一致 */
  currentTags?: Record<string, string>;
}
