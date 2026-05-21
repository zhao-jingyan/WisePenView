export type EntryType = 'folder' | 'resource' | 'link' | 'trash' | 'loadMore';

export interface EntryIconProps {
  /** 展示对象类型；resource 可结合 resourceType 渲染具体资源图标 */
  entryType: EntryType;
  /** 资源类型：note 为笔，其余资源为文件 */
  resourceType?: string;
  size?: number;
  /** 覆盖默认颜色；folder 默认 warning，其余默认 text-secondary */
  color?: string;
}
