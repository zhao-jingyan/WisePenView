import type { GroupFileOrgLogic } from '@/domains/Group';

export interface TagPermissionModalProps {
  open: boolean;
  groupId?: string;
  fileOrgLogic?: GroupFileOrgLogic;
  initialTagId?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}
