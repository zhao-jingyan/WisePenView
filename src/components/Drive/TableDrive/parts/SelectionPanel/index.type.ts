import type { DriveNode } from '@/domains/Drive';
import type { DriveTableRow } from '../../index.type';

export interface TableDriveSelectionPanelProps {
  selectedRow?: DriveTableRow;
  batchEditMode?: boolean;
  batchSelectedCount?: number;
  groupId?: string;
  onEnter: (nodeId: string) => void;
  onOpen: (node: DriveNode) => void;
  onClear: () => void;
  onRefresh: () => void;
}
