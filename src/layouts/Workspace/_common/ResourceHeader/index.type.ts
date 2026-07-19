import type {
  ResourceAction,
  ResourceIconType,
  ResourcePermissionResourceType,
} from '@/domains/Resource';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ResourceHeaderDownloadAction {
  label: string;
  onAction: () => void;
}

export interface ResourceHeaderMoreAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onAction(): void;
}

export interface ResourceHeaderMoreMenu {
  advanced?: ReactNode;
  actions?: readonly ResourceHeaderMoreAction[];
  onPrint?: () => void;
  download?: ResourceHeaderDownloadAction;
  isPending?: boolean;
}

export interface ResourceHeaderBreadcrumbItem {
  nodeId: string;
  label: string;
}

export interface ResourceHeaderConfig {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  permissionResourceType: ResourcePermissionResourceType;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  isDisabled?: boolean;
  titleMeta?: ReactNode;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  moreMenu?: ResourceHeaderMoreMenu;
}

export interface ResourceHeaderProps extends ResourceHeaderConfig {
  breadcrumbItems: ResourceHeaderBreadcrumbItem[];
  onBreadcrumbNavigate: (nodeId: string) => void;
}
