import type { FolderTableRow } from '../../index.type';

export interface FolderTableNameCellProps<T extends FolderTableRow> {
  row: T;
  depth: number;
  expanded: boolean;
  expandable: boolean;
  onToggleExpand?: () => void;
}
