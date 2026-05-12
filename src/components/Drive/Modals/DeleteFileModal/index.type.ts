import type { ResourceItem } from '@/domains/Resource';

export interface DeleteFileModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}
