import { useDriveService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Button, Input, Modal } from 'antd';
import { useCallback, useState } from 'react';
import type { DriveActionTarget } from '../../../common/driveComponentModel';
import type { RenameNodeModalProps } from './index.type';
import styles from './style.module.less';

function getDefaultName(node: DriveActionTarget | null): string {
  if (!node) return '';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function RenameNodeModal({ open, node, groupId, onCancel, onSuccess }: RenameNodeModalProps) {
  const driveService = useDriveService();
  const message = useAppMessage();
  const [name, setName] = useState('');

  const handleOpenChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        setName(getDefaultName(node));
      }
    },
    [node]
  );

  const { loading, run: runRenameNode } = useRequest(
    async (trimmed: string) => {
      if (!node) return;
      await driveService.renameNode({ nodeId: node.id, newName: trimmed, groupId });
    },
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
    if (!node) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请输入名称');
      return;
    }
    runRenameNode(trimmed);
  };

  const title = node?.type === 'folder' ? '重命名文件夹' : '重命名文件';

  return (
    <Modal
      title={title}
      open={open && !!node}
      onCancel={onCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      width={420}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleSubmit} loading={loading}>
          确定
        </Button>,
      ]}
    >
      <Input
        className={styles.input}
        placeholder="请输入新名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
      />
    </Modal>
  );
}

export default RenameNodeModal;
