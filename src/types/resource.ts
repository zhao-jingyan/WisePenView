/**
 * Resource 领域模型
 * path 与 tags 在领域层区分：path 为路径/文件夹归属，tags 为用户可见标签
 */

/** 资源项实体 */
export interface ResourceItem {
  resourceId: string;
  resourceName: string;
  resourceType?: string;
  ownerId?: string;
  preview?: string;
  size?: number;
  /** 归属路径（文件夹），如 '/' 或 '/documents/notes' */
  path?: string;
  /** 用户可见 tag 名称列表 */
  tagNames?: string[];
}

/** 资源列表分页结果（与 OpenAPI PageResultResourceItemResponse 一致） */
export interface ResourceListPage {
  list: ResourceItem[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
