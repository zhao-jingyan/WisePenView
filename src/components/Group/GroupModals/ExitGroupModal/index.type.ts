export interface ExitGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupName: string;
  groupId?: string;
}
