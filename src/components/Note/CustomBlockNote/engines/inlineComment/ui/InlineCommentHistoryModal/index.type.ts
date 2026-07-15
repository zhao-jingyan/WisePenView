import type { ReactNode } from 'react';

export interface InlineCommentHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}
