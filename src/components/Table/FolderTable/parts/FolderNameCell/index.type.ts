import type { ReactNode } from 'react';
import type { FolderTableRow, FolderTableRowContext } from '../../index.type';

export interface FolderTableNameCellProps<T extends FolderTableRow> {
  row: T;
  depth: number;
  expanded: boolean;
  expandable: boolean;
  onToggleExpand?: () => void;
  renderNameContent?: (content: ReactNode, row: T, ctx: FolderTableRowContext<T>) => ReactNode;
}
