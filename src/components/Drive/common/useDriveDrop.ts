import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { getDriveScopeGroupId } from './driveComponentModel';

/** drop dataTransfer 单一 mime：序列化整个 DriveNode；source 节点的 type 由接收端读 node.type 判断 */
export const DRAG_TYPE_DRIVE_NODE = 'application/x-wisepen-drivenode';

/** 可作为 drag source 的 DriveNode 子类型：folder / resource / link */
export type DraggableDriveNode = Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>;

/** 可作为 drop target 的 DriveNode 子类型：云盘根 / folder */
export type DropTargetDriveNode = Extract<DriveNode, { type: 'root' | 'folder' }>;

/** 业务侧入参：仅需要 drop 成功后的 refresh 钩子；移动语义由 service 内部处理 */
export interface UseDriveDropParams {
  /** drop 成功后由调用方触发的刷新（通常重新拉当前层级 children） */
  refresh: () => void;
  groupId?: string;
}

/** drop 业务入口：把任意可拖拽 DriveNode 移到目标容器节点（root / folder）下 */
export type OnDriveNodeDrop = (sourceNode: DriveNode, targetNode: DriveNode) => Promise<void>;

export interface UseDriveDropReturn {
  /** 拖放业务入口；调用方负责装配 HTML5 拖拽事件，把 source 与 target 透传给 onDrop */
  onDrop: OnDriveNodeDrop;
}

export const isDraggableDriveNode = (node: DriveNode): node is DraggableDriveNode =>
  node.type === 'folder' || node.type === 'resource' || node.type === 'link';

export const isDropTargetDriveNode = (node: DriveNode): node is DropTargetDriveNode =>
  node.type === 'root' || node.type === 'folder';

const getTargetTagId = (target: DropTargetDriveNode): string | undefined => {
  if (target.type === 'folder') return target.tagId;
  if (target.canMountResources) return target.tagId;
  return undefined;
};

const canMountResourceToTarget = (target: DropTargetDriveNode): boolean =>
  target.type === 'folder' || target.canMountResources;

const getNodeLabel = (node: DriveNode): string => {
  switch (node.type) {
    case 'root':
      return node.name;
    case 'folder':
      return node.name;
    case 'resource':
    case 'link':
      return node.title;
    case 'loading':
      return '';
  }
};

const buildSuccessMessage = (source: DriveNode, target: DriveNode): string => {
  const sourceLabel = getNodeLabel(source);
  return `已将「${sourceLabel}」移动到「${getNodeLabel(target)}」下`;
};

/**
 * Drive 拖放业务 hook（仿照旧版 useTreeDriveDrop 的职责）：
 * - source：可拖拽节点（folder / resource / link）
 * - target：容器节点（root / folder）
 * - 内部校验：source 必须可拖；target 必须可放；不能拖到自己；同 parent 不动
 * - service.moveToFolder 兜底剩余业务校验（如 folder 拖到自身子孙等需要 path 信息的场景）
 * - 成功后 toast + 调用方传入的 refresh；失败统一走 toast.danger
 *
 * 注：调用方负责 HTML5 拖拽事件装配（onDragStart 写入 DRAG_TYPE_DRIVE_NODE、onDrop 读取后传入 onDrop）。
 */
export function useDriveDrop({ refresh, groupId }: UseDriveDropParams): UseDriveDropReturn {
  const driveService = useDriveService();
  const onDrop: OnDriveNodeDrop = async (source, target) => {
    if (!isDraggableDriveNode(source)) return;
    if (!isDropTargetDriveNode(target)) return;
    if (source.id === target.id) return;
    if (source.parentId === target.id) return;
    if (source.scope.rootId !== target.scope.rootId) {
      toast.danger('暂不支持跨云盘移动');
      return;
    }
    if (
      !canMountResourceToTarget(target) &&
      (source.type === 'resource' || source.type === 'link')
    ) {
      toast.danger('小组云盘文件需要移动到具体目录');
      return;
    }
    if (source.type === 'link' && getTargetTagId(target) === source.primaryTagId) {
      toast.danger('快捷方式不能移动到主位置');
      return;
    }

    try {
      await driveService.moveToFolder({
        nodeId: source.id,
        targetFolderNodeId: target.id,
        groupId:
          groupId ?? getDriveScopeGroupId(target.scope) ?? getDriveScopeGroupId(source.scope),
      });
      toast.success(buildSuccessMessage(source, target));
      refresh();
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  return { onDrop };
}
