export interface TagPermissionModalProps {
  open: boolean;
  groupId?: string;
  initialTagId?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}
