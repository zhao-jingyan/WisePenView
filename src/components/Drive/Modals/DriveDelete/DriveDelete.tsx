import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useDriveService, useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';

import type { DriveActionTarget } from '../../common/driveComponentModel';

export interface DriveDeleteProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  groupId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function getNodeName(node: DriveActionTarget | null): string {
  if (!node) return '未命名';
  return node.type === 'folder' ? node.name : node.title;
}

function DriveDelete({ isOpen, node, groupId, onOpenChange, onSuccess }: DriveDeleteProps) {
  const driveService = useDriveService();
  const resourceService = useResourceService();
  const isGroupNode = Boolean(groupId && node);
  const isGroupResource = Boolean(groupId && node && node.type !== 'folder');

  const { loading, run: runDelete } = useRequest(
    async () => {
      if (!node) return;
      if (!groupId && node.type === 'resource') {
        await resourceService.removeResources({ resourceIds: [node.resourceId] });
        return;
      }
      await driveService.removeNode({ nodeId: node.id, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(
          node?.type === 'link' ? '链接已删除' : isGroupNode ? '已从小组移除' : '已移入回收站'
        );
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const isFolder = node?.type === 'folder';
  const isLink = node?.type === 'link';
  const isPrimaryGroupMount = Boolean(groupId && node?.type === 'resource');
  const nodeName = getNodeName(node);
  const title = isLink ? '删除链接' : isGroupNode ? '从小组移除' : '移入回收站';
  const description = (() => {
    if (isLink) {
      return `确定删除「${nodeName}」在当前文件夹中的链接吗？文件本体不会被删除。`;
    }
    if (groupId && isFolder) {
      return `确定从当前小组移除「${nodeName}」及其下属内容的挂载吗？`;
    }
    if (isPrimaryGroupMount) {
      return `「${nodeName}」是当前小组的主挂载文件，移除后会同时解除它在当前小组下的全部挂载关系。确定继续吗？`;
    }
    if (isGroupResource) {
      return `确定从当前小组文件夹移除「${nodeName}」的挂载吗？`;
    }
    if (isFolder) {
      return `确定将「${nodeName}」及其下属内容移入回收站吗？`;
    }
    return `确定将「${nodeName}」移入回收站吗？它的所有链接会同步失效，之后可从回收站恢复。`;
  })();
  const confirmText = isLink ? '删除链接' : isGroupNode ? '移除' : '移入回收站';

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen && !!node}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      onConfirm={() => runDelete()}
      isConfirmLoading={loading}
      isDismissable={!loading}
    />
  );
}

export default DriveDelete;
