import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 与 OpenAPI 文档语义对应的别名，值为接口要求的字符串 */
export const TAG_VISIBILITY_MODE = createEnum([
  { value: '0', key: 'ALL', label: '全部可见' },
  { value: '1', key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: '2', key: 'WHITELIST', label: '白名单' },
  { value: '3', key: 'BLACKLIST', label: '黑名单' },
] as const);

/** OpenAPI TagTreeResponse.visibilityMode / TagCreateRequest / TagUpdateRequest */
export type TagVisibilityModeString = EnumValue<typeof TAG_VISIBILITY_MODE>;

export type TagVisibilityMode = EnumValue<typeof TAG_VISIBILITY_MODE>;

/** 访问权限下发模式（与 OpenAPI AclGrantMode 对齐） */
export const TAG_ACL_GRANT_MODE = createEnum([
  { value: 0, key: 'ALL', label: '全部' },
  { value: 1, key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: 2, key: 'WHITELIST', label: '白名单' },
  { value: 3, key: 'BLACKLIST', label: '黑名单' },
] as const);

export type TagAclGrantMode = EnumValue<typeof TAG_ACL_GRANT_MODE>;

/** 资源挂载权限（与 OpenAPI ResourceMountMode 对齐） */
export const TAG_RESOURCE_MOUNT_MODE = createEnum([
  { value: 0, key: 'ALL', label: '全部' },
  { value: 1, key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: 2, key: 'WHITELIST', label: '白名单' },
  { value: 3, key: 'BLACKLIST', label: '黑名单' },
] as const);

export type TagResourceMountMode = EnumValue<typeof TAG_RESOURCE_MOUNT_MODE>;

/** 资源访问权限（与 OpenAPI ResourceAction 对齐） */
export const TAG_RESOURCE_ACTION = createEnum([
  { value: 1, key: 'DISCOVER', label: '列表可见' },
  { value: 2, key: 'VIEW', label: '在线阅读' },
  { value: 4, key: 'EDIT', label: '协同编辑' },
  { value: 8, key: 'DOWNLOAD_WATERMARK', label: '导出/下载带水印' },
  { value: 16, key: 'DOWNLOAD_ORIGINAL', label: '下载源文件' },
] as const);

export type TagResourceAction = EnumValue<typeof TAG_RESOURCE_ACTION>;
