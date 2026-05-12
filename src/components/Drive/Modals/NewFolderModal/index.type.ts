import type { Folder } from '@/domains/Folder';

export interface NewFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  /** 父目录，由调用方根据当前路径解析，弹窗内不可更改 */
  parentFolder: Folder | null;
}
