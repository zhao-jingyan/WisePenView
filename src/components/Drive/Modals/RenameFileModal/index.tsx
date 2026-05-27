import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Button, Input, Modal } from 'antd';
import { useCallback, useState } from 'react';
import type { RenameFileModalProps } from './index.type';

function RenameFileModal({ open, onCancel, onSuccess, file }: RenameFileModalProps) {
  const resourceService = useResourceService();
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
        toast.success('重命名成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!file?.resourceId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入文件名称');
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
