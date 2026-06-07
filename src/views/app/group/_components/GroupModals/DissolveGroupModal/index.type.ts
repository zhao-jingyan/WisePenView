export interface DissolveGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId: string;
  groupName: string;
}
