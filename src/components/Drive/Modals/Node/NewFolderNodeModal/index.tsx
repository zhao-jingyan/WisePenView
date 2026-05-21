import { useDriveService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { useRequest } from 'ahooks';
import { Button, Input, Modal } from 'antd';
import { useCallback, useState } from 'react';
import type { NewFolderNodeModalProps } from './index.type';
import styles from './style.module.less';

function NewFolderNodeModal({
  open,
  parentId,
  groupId,
  parentLabel,
  existingFolderNames = [],
  onCancel,
  onSuccess,
}: NewFolderNodeModalProps) {
  const driveService = useDriveService();
  const message = useAppMessage();
  const [name, setName] = useState('');

  const handleOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setName('');
    }
  }, []);

  const { loading, run: runCreateFolder } = useRequest(
    async (trimmed: string) =>
      driveService.createNode({ parentId, name: trimmed, type: 'folder', groupId }),
    {
      manual: true,
      onSuccess: () => {
        message.success('新建成功');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入文件夹名称');
      return;
    }
    const validation = validateReservedName(trimmed);
    if (!validation.valid) {
      message.warning(validation.reason);
      return;
    }
    if (existingFolderNames.includes(trimmed)) {
      message.warning('当前目录下已存在同名文件夹');
      return;
    }
    runCreateFolder(trimmed);
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      title="新建文件夹"
      open={open}
      onCancel={handleCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      width={420}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleSubmit} loading={loading}>
          创建
        </Button>,
      ]}
    >
      <div className={styles.pathHint}>
        {parentLabel ? `创建到「${parentLabel}」下` : '当前目录'}
      </div>
      <Input
        className={styles.input}
        placeholder="请输入文件夹名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
      />
    </Modal>
  );
}

export default NewFolderNodeModal;
