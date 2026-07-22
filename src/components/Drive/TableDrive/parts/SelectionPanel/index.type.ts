import type { DriveActionTarget } from '@/components/Drive/common/driveComponentModel';
import type { ResourcePermissionModalTarget } from '@/components/Drive/Modals';
import type { DriveNode } from '@/domains/Drive';
import type { DriveTableRow } from '../../index.type';

export interface TableDriveSelectionPanelProps {
  selectedRow?: DriveTableRow;
  selectedCount?: number;
  /** 收藏页复用详情面板时，只展示收藏页允许的操作。 */
  mode?: 'drive' | 'favorite';
  groupId?: string;
  isTrashView?: boolean;
  canManageTagPermission?: boolean;
  tagPermissionRefreshToken?: number;
  resourcePermissionRefreshToken?: number;
  onEnter: (nodeId: string) => void;
  onOpen: (node: DriveNode) => void;
  onRename: (node: DriveActionTarget) => void;
  onMove: (node: DriveActionTarget) => void;
  onDelete: (node: DriveActionTarget) => void;
  onRemoveFavorite?: (node: DriveActionTarget) => void;
  onManageTagAccessPermission?: (tagId: string) => void;
  onManageTagMountPermission?: (tagId: string) => void;
  onManageResourcePermission?: (target: ResourcePermissionModalTarget) => void;
  onTagPermissionChange?: () => void;
}
