import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Alert, Button, Modal } from 'antd';
import type { DeleteNodeModalProps } from './index.type';

function getNodeName(node: DeleteNodeModalProps['node']): string {
  if (!node) return '未命名';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function DeleteNodeModal({ open, node, groupId, onCancel, onSuccess }: DeleteNodeModalProps) {
  const driveService = useDriveService();
  const { loading, run: runDeleteNode } = useRequest(
    async () => {
      if (!node) return;
      await driveService.removeNode({ nodeId: node.id, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('删除成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!node) return;
    runDeleteNode();
  };

  const isFolder = node?.type === 'folder';
  const title = isFolder ? '删除文件夹' : '删除文件';
  const description = isFolder
    ? `确定删除「${getNodeName(node)}」及其下属内容吗？此操作不可撤销。`
    : `确定删除「${getNodeName(node)}」吗？此操作不可撤销。`;

  return (
    <Modal
      title={title}
      open={open && !!node}
      onCancel={onCancel}
      destroyOnHidden
      width={500}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" danger onClick={handleConfirm} loading={loading}>
          删除
        </Button>,
      ]}
    >
      <Alert type="warning" showIcon description={description} />
    </Modal>
  );
}

export default DeleteNodeModal;
