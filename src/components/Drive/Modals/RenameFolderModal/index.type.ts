import type { Folder } from '@/domains/Folder';

export interface RenameFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}
