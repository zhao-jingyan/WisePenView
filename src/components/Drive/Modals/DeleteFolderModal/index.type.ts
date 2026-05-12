import type { Folder } from '@/domains/Folder';

export interface DeleteFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}
