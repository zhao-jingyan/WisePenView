import type { DriveActionTarget } from '@/components/Drive/common/driveComponentModel';
import type { ResourcePermissionModalTarget } from '@/components/Drive/Modals';
import type { DriveNode } from '@/domains/Drive';
import type { DriveTableRow } from '../../index.type';

export interface TableDriveSelectionPanelProps {
  selectedRow?: DriveTableRow;
  batchEditMode?: boolean;
  batchSelectedCount?: number;
  groupId?: string;
  canManageTagPermission?: boolean;
  tagPermissionRefreshToken?: number;
  resourcePermissionRefreshToken?: number;
  onEnter: (nodeId: string) => void;
  onOpen: (node: DriveNode) => void;
  onRename: (node: DriveActionTarget) => void;
  onMove: (node: DriveActionTarget) => void;
  onDelete: (node: DriveActionTarget) => void;
  onManageTagPermission?: (tagId: string) => void;
  onManageResourcePermission?: (target: ResourcePermissionModalTarget) => void;
  onTagPermissionChange?: () => void;
}
