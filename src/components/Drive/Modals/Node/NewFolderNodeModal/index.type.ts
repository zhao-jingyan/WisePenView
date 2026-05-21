export interface NewFolderNodeModalProps {
  open: boolean;
  parentId: string;
  groupId?: string;
  parentLabel?: string;
  existingFolderNames?: string[];
  onCancel: () => void;
  onSuccess?: () => void;
}
