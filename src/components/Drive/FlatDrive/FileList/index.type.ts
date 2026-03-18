import type { FileFilterValue } from '@/components/Drive/FlatDrive/FileFilter/index.type';

export interface FileListProps {
  /** 小组 ID，不传则查个人资源 */
  groupId?: string;
  /** 筛选与排序配置，用于请求列表接口 */
  filter: FileFilterValue;
}
