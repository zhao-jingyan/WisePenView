import type { ResourceItem } from '@/domains/Resource';

export interface RemoveFileFromGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId?: string;
  file: ResourceItem | null;
}
