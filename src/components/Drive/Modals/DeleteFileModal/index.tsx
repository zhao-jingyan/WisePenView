import { useDocumentService, useNoteService } from '@/domains';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useNewNoteStore, usePdfPreviewProgressStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Alert, Button, Modal } from 'antd';
import type { DeleteFileModalProps } from './index.type';

function DeleteFileModal({ open, onCancel, onSuccess, file }: DeleteFileModalProps) {
  const documentService = useDocumentService();
  const noteService = useNoteService();
  const message = useAppMessage();

  const { loading, run: runDeleteFile } = useRequest(
    async () => {
      const resourceId = file!.resourceId!;
      if (file!.resourceType === RESOURCE_TYPE.NOTE) {
        await noteService.deleteNote({ resourceIds: [resourceId] });
        return resourceId;
      }
      await documentService.deleteDocument(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (deletedResourceId) => {
        if (deletedResourceId) {
          // 资源已删除，同步清理与之绑定的临时状态
          usePdfPreviewProgressStore.getState().removeProgress(deletedResourceId);
          useNewNoteStore.getState().clearNewNoteResourceId(deletedResourceId);
        }
        message.success('文件已删除');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = async () => {
    if (!file?.resourceId) return;
    runDeleteFile();
  };

  const displayName = file?.resourceName || '未命名';

  return (
    <Modal
      title="删除文件"
      open={open && !!file}
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
        description={`确定要删除「${displayName}」吗？此操作不可撤销！`}
        type="warning"
        showIcon
      />
    </Modal>
  );
}

export default DeleteFileModal;
