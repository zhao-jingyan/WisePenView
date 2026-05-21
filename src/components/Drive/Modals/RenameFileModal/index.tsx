import { useResourceService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Button, Input, Modal } from 'antd';
import { useCallback, useState } from 'react';
import type { RenameFileModalProps } from './index.type';

function RenameFileModal({ open, onCancel, onSuccess, file }: RenameFileModalProps) {
  const resourceService = useResourceService();
  const message = useAppMessage();
  const [name, setName] = useState('');

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible && file) {
        setName(file.resourceName || '');
      }
    },
    [file]
  );

  const { loading, run: runRenameFile } = useRequest(
    async (trimmed: string) =>
      resourceService.renameResource({
        resourceId: file!.resourceId!,
        newName: trimmed,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success('重命名成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!file?.resourceId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件名称');
      return;
    }
    runRenameFile(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      title="重命名文件"
      open={open && !!file}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleSubmit} loading={loading}>
          确定
        </Button>,
      ]}
      width={400}
    >
      <Input
        placeholder="请输入新名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
      />
    </Modal>
  );
}

export default RenameFileModal;
