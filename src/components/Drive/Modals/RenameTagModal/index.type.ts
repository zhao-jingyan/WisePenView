import type { TagTreeNode } from '@/domains/Tag/service/index.type';

export interface RenameTagModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  tag: TagTreeNode | null;
  groupId?: string;
}
