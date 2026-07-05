import type { ReactNode } from 'react';
import type { DriveTableRow } from '../../../../index.type';

export interface NodeInfoSectionProps {
  selectedRow: DriveTableRow;
}

export interface NodeInfoField {
  id: string;
  label: string;
  value: ReactNode;
  muted?: boolean;
}
