import { useFolderService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/tag/path';
import { useRequest } from 'ahooks';
import { Alert, Button, Modal } from 'antd';
import React from 'react';
import type { DeleteFolderModalProps } from './index.type';

const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  folder,
}) => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const { loading, run: runDeleteFolder } = useRequest(
    async () => folderService.deleteFolder(folder!),
    {
      manual: true,
      onSuccess: () => {
        message.success('文件夹已删除');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '删除失败'));
      },
    }
  );

  const handleConfirm = async () => {
    if (!folder?.tagId) return;
    runDeleteFolder();
  };

  const displayName = folder ? getFolderDisplayName(folder.tagName ?? '') : '未命名';

  return (
    <Modal
      title="删除文件夹"
      open={open && !!folder}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" danger type="primary" onClick={handleConfirm} loading={loading}>
          删除
        </Button>,
      ]}
      width={500}
    >
      <Alert
        description={`确定要删除文件夹「${displayName}」及其下属所有内容吗？此操作不可撤销！`}
        type="warning"
        showIcon
      />
    </Modal>
  );
};

export default DeleteFolderModal;
