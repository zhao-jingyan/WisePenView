import type { ReactNode } from 'react';

/** 列宽*/
export type TableColumnWidth = 'fill' | 'sm' | 'md' | 'lg' | 'eq';

/** 滚动加载更多（DataTable / FolderTable 共用） */
export interface TableLoadMore {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

/** 列定义基底*/
export interface TableColumnBase<T extends object, TContext = unknown> {
  id: string;
  label: ReactNode;
  width?: TableColumnWidth;
  /** 列对齐默认 center */
  align?: 'start' | 'center' | 'end';
  allowsSorting?: boolean;
  isRowHeader?: boolean;
  className?: string;
  renderCell: (row: T, ctx: TContext) => ReactNode;
}
