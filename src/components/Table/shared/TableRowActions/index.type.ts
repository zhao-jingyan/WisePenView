import type { ReactNode } from 'react';

export interface TableRowActionItem {
  key: string;
  label: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

/** 行 ⋯ 菜单项（ManageTable / FolderTable 共用） */
export interface TableRowAction<T> extends Omit<TableRowActionItem, 'disabled'> {
  visible?: boolean | ((row: T) => boolean);
  disabled?: boolean | ((row: T) => boolean);
  onPress: (row: T) => void;
}

export interface TableRowActionsProps {
  actions: TableRowActionItem[];
  ariaLabel?: string;
  onAction: (key: string) => void;
}
