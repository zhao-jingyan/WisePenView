import type { ReactNode } from 'react';

export interface TableBodyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}
