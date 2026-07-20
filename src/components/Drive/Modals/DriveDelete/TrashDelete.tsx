import { clearNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { removePdfPreviewProgress } from '@/components/PdfViewer/_store/usePdfPreviewProgressStore';
import { useDriveService, useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';

import type { DriveActionTarget } from '../../common/driveComponentModel';

export interface TrashDeleteProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function getNodeName(node: DriveActionTarget | null): string {
  if (!node) return '未命名';
  return node.type === 'folder' ? node.name : node.title;
}

function TrashDelete({ isOpen, node, onOpenChange, onSuccess }: TrashDeleteProps) {
  const driveService = useDriveService();
  const resourceService = useResourceService();

  const { loading, run: runDelete } = useRequest(
    async () => {
      if (!node) return;
      if (node.type === 'resource') {
        await resourceService.removeResources({ resourceIds: [node.resourceId] });
        return;
      }
      await driveService.removeNode({ nodeId: node.id });
    },
    {
      manual: true,
      onSuccess: () => {
        if (node?.type === 'folder') {
          clearNewNoteStore();
        } else if (node?.type === 'resource') {
          clearNewNoteStore(node.resourceId);
          removePdfPreviewProgress(node.resourceId);
        }
        toast.success('已永久删除');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const nodeName = getNodeName(node);
  const description =
    node?.type === 'folder'
      ? `确定永久删除「${nodeName}」及其下属内容吗？此操作不可撤销。`
      : `确定永久删除「${nodeName}」吗？此操作不可撤销。`;

  return (
    <AppAlertDialog
      type="danger"
      isOpen={isOpen && !!node}
      onOpenChange={onOpenChange}
      title="永久删除"
      description={description}
      confirmText="永久删除"
      onConfirm={() => runDelete()}
      isConfirmLoading={loading}
      isDismissable={!loading}
    />
  );
}

export default TrashDelete;
