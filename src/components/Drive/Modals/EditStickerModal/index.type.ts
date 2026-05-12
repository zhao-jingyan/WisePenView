import type { ResourceItem } from '@/domains/Resource';

export interface EditStickerModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}
