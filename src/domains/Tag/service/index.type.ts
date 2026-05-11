/**
 * Tag 相关类型与 ITagService
 * 与 docs/apis/resource.openapi.json 中 Tag 相关 schema、路径一致（无字段重命名）
 */

import type { TagListByTagResponse } from '@/types/tag';

/** TagService 接口：供依赖注入使用 */
export interface ITagService {
  /** 获取标签树（带缓存），返回多个根节点 */
  getTagTree(groupId?: string): Promise<TagTreeNode[]>;
  /** 从已缓存的扁平索引中按 tagId 查找标签节点（需先调用 getTagTree） */
  getTagById(tagId: string, groupId?: string): TagTreeNode | undefined;
  /** 获取某标签下的子标签 + 文件列表（分页） */
  getResByTag(params: GetResByTagRequest): Promise<TagListByTagResponse>;
  updateTag(params: TagUpdateRequest): Promise<void>;
  addTag(params: TagCreateRequest): Promise<string>;
  deleteTag(params: TagDeleteRequest): Promise<void>;
  moveTag(params: TagMoveRequest): Promise<void>;
}

/** getResByTag 请求参数 */
export interface GetResByTagRequest {
  tag: TagTreeNode;
  filePage?: number;
  filePageSize?: number;
}

/** OpenAPI TagTreeResponse.visibilityMode / TagCreateRequest / TagUpdateRequest */
export type TagVisibilityModeString = '0' | '1' | '2' | '3';

/** 与 OpenAPI 文档语义对应的别名，值为接口要求的字符串 */
export const TAG_VISIBILITY_MODE = {
  ALL: '0',
  ONLY_ADMIN: '1',
  WHITELIST: '2',
  BLACKLIST: '3',
} as const satisfies Record<string, TagVisibilityModeString>;

export type TagVisibilityMode = (typeof TAG_VISIBILITY_MODE)[keyof typeof TAG_VISIBILITY_MODE];

/**
 * 标签树节点（OpenAPI TagTreeResponse）
 * 接口实际始终返回 tagId、tagName；其余字段与文档一致。children 为树形递归。
 */
export interface TagTreeResponse {
  tagId: string;
  tagName: string;
  groupId?: string;
  tagDesc?: string;
  visibilityMode?: TagVisibilityModeString;
  specifiedUsers?: string[];
  parentId?: string;
  children?: TagTreeResponse[];
}

/** 领域别名：路径文件夹语义（与 TagTreeResponse 相同结构） */
export type TagTreeNode = TagTreeResponse;

/** POST /resource/tag/addTag */
export interface TagCreateRequest {
  groupId?: string;
  parentId?: string;
  tagName: string;
  tagDesc?: string;
  visibilityMode?: TagVisibilityModeString;
  specifiedUsers?: string[];
}

/** POST /resource/tag/changeTag */
export interface TagUpdateRequest {
  groupId?: string;
  tagName?: string;
  tagDesc?: string;
  visibilityMode?: TagVisibilityModeString;
  specifiedUsers?: string[];
  targetTagId: string;
}

/** POST /resource/tag/removeTag */
export interface TagDeleteRequest {
  groupId?: string;
  targetTagId: string;
}

/** POST /resource/tag/moveTag */
export interface TagMoveRequest {
  groupId?: string;
  targetTagId: string;
  newParentId?: string;
}
