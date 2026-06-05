export interface FolderTableBreadcrumbItem {
  id: string;
  label: string;
  isRoot?: boolean;
}

export interface FolderTableBreadcrumbProps {
  items: FolderTableBreadcrumbItem[];
  onJump: (id: string) => void;
  ariaLabel?: string;
}
