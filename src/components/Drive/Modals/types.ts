import type { Folder } from '@/domains/Folder';
import type { ResourceItem } from '@/domains/Resource';

/** 移动到文件夹的目标：文件或文件夹 */
export type MoveToFolderTarget =
  | { type: 'file'; data: ResourceItem }
  | { type: 'folder'; data: Folder };
