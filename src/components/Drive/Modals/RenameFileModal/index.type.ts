import type { ResourceItem } from '@/domains/Resource';

export interface RenameFileModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}
