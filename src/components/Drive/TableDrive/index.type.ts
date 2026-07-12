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
    canCreateNote?: boolean;
    canCreateDrawio?: boolean;
    canCreateSkill?: boolean;
    canUploadDocument?: boolean;
    canUploadToGroup?: boolean;
    canManageTagPermission?: boolean;
  };
}

export interface TableDriveHandle {
  openTrash: () => Promise<void>;
}

export interface TableDriveProps {
  /** 个人云盘不传；小组云盘传 groupId */
  groupId?: string;
  rootId?: string;
  /** 从路由进入云盘时需要直接打开的目录节点 */
  initialNodeId?: string;
  scope?: DriveScope;
  actions?: TableDriveActionConfig;
  /** 回收站视图变化时通知页面级 header 按钮状态 */
  onTrashViewChange?: (isTrashView: boolean) => void;
  /** 文档上传成功后回调（如同步刷新上传队列） */
  onUploadSuccess?: () => void;
  /** 是否在表头工具栏展示回收站按钮；页面级 header 接管时为 false */
  showToolbarTrash?: boolean;
  /** 小组页等场景去掉列表左侧内边距 */
  disableListPadding?: boolean;
}
