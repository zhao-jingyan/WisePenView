import type { DriveNode } from '@/domains/Drive';
import type { DriveActionTarget, DriveScope } from '../common/driveComponentModel';

/** TableDrive 行类型：DriveNode 本身（含 LoadMoreNode），可选挂 children */
export type DriveRow = DriveNode & { children?: DriveRow[] };

export type DriveRowPredicate = boolean | ((node: DriveActionTarget) => boolean);

export interface TableDriveActionConfig {
  toolbar?: {
    canCreateFolder?: boolean;
    canUploadToGroup?: boolean;
    canManageTagPermission?: boolean;
  };
  row?: {
    canRename?: DriveRowPredicate;
    canDelete?: DriveRowPredicate;
    canMove?: DriveRowPredicate;
    canManageNodePermission?: DriveRowPredicate;
  };
}

export interface TableDriveProps {
  /** 个人云盘不传；小组云盘传 groupId */
  groupId?: string;
  rootId?: string;
  scope?: DriveScope;
  actions?: TableDriveActionConfig;
}
