import type { ReactNode } from 'react';

export interface TableEditErrorToastProps {
  message: ReactNode;
  onDismiss?: () => void;
  className?: string;
}
