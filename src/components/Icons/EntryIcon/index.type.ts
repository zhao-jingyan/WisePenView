import type { ResourceIconType } from '@/domains/Resource';

export type EntryType = 'root' | 'folder' | 'resource' | 'link' | 'loading';
export type FolderIconType = 'shared';

export interface EntryIconProps {
  /** 展示对象类型；resource 可结合 resourceType 渲染具体资源图标 */
  entryType: EntryType;
  /** 文件夹细分图标；普通文件夹不传 */
  folderIconType?: FolderIconType;
  /** 业务资源类型：保留给跳转语义兼容 */
  resourceType?: string;
  /** 资源名称：用于从扩展名推断 pdf/doc/ppt/xls/md 等展示图标 */
  resourceName?: string;
  /** 图标展示用资源细分类型 */
  resourceIconType?: ResourceIconType;
  size?: number;
  /** 覆盖默认颜色；folder 默认 warning，其余默认 text-secondary */
  color?: string;
}
