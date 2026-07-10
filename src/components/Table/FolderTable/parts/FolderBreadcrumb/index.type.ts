import type { DragEvent } from 'react';

export interface FolderTableBreadcrumbItem {
  id: string;
  label: string;
  isRoot?: boolean;
}

export interface FolderTableBreadcrumbDropTarget {
  isDropActive?: (item: FolderTableBreadcrumbItem) => boolean;
  onDragEnter?: (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => void;
  onDragOver?: (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => void;
  onDragLeave?: (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => void;
  onDrop?: (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => void;
}

export interface FolderTableBreadcrumbProps {
  items: FolderTableBreadcrumbItem[];
  onJump: (id: string) => void;
  ariaLabel?: string;
  dropTarget?: FolderTableBreadcrumbDropTarget;
}
