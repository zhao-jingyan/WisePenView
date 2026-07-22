import type { SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';
import type {
  TableColumnBase,
  TableColumnWidth,
  TableLoadMore,
} from '../shared/TableBase/index.type';
import type { TableRowPressContext } from '../shared/TableBase/rowPress';

export interface DataTableRowContext<T> {
  row: T;
  rowId: string;
}

export type DataTableRowPressContext = TableRowPressContext;

export interface DataTableColumn<T extends object> extends Omit<
  TableColumnBase<T, DataTableRowContext<T>>,
  'renderCell'
> {
  width?: TableColumnWidth;
  renderCell: (row: T, ctx: DataTableRowContext<T>) => ReactNode;
}

export type DataTableLoadMore = TableLoadMore;

export interface DataTablePagination {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  summary?: ReactNode;
  pageSizeControl?: ReactNode;
}

export interface DataTableProps<T extends object> {
  ariaLabel: string;
  items: T[];
  rowKey: keyof T & string;
  columns: DataTableColumn<T>[];
  loading?: boolean;
  refreshing?: boolean;
  emptyText?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  skeletonRowCount?: number;
  className?: string;
  maxBodyHeight?: number | string;
  title?: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  loadMore?: DataTableLoadMore;
  totalCount?: number;
  pagination?: DataTablePagination;
  summary?: ReactNode;
  getRowClassName?: (row: T, ctx: DataTableRowContext<T>) => string | undefined;
  /** 单击行选中；再次单击当前行时触发行激活 */
  onRowSelect?: (row: T, ctx: DataTableRowPressContext) => void;
  /** 行激活，例如打开资源 */
  onRowActivate?: (row: T) => void;
  /** 当前选中的行 id */
  selectedRowKey?: string;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}

export type { DataTableTab, DataTableTabsProps } from './parts/UnderlineTabs/index.type';
