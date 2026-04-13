export interface EditGroupInfoModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId?: string;
  groupName?: string;
  description?: string;
  cover?: string;
  groupType?: number;
}
