import type { LocalResourcePayload } from '../index.type';

export interface DocumentPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (resources: LocalResourcePayload[]) => void;
}
