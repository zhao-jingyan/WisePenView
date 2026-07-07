import type { FolderTableRow } from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import type { DriveScope } from '../common/driveComponentModel';

/** TableDrive 行类型：DriveNode 本身（含 loading 占位节点），可选挂 children */
export type DriveRow = DriveNode & { children?: DriveRow[] };

/** FolderTable 展示行：保留原始 DriveNode，避免 UI 模型污染 service 模型 */
export type DriveTableRow = FolderTableRow & {
  node: DriveNode;
  children?: DriveTableRow[];
};

export interface TableDriveActionConfig {
  toolbar?: {
    canCreateFolder?: boolean;
    canUploadToGroup?: boolean;
    canManageTagPermission?: boolean;
  };
}

export interface TableDriveProps {
  /** 个人云盘不传；小组云盘传 groupId */
  groupId?: string;
  rootId?: string;
  scope?: DriveScope;
  actions?: TableDriveActionConfig;
  disableListPadding?: boolean;
}
