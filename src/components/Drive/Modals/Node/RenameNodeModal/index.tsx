import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useDriveService } from '@/domains';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Input, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { DriveActionTarget } from '../../../common/driveComponentModel';
import type { RenameNodeModalProps } from './index.type';
import styles from './style.module.less';

function getDefaultName(node: DriveActionTarget | null): string {
  if (!node) return '';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function RenameNodeModal({ isOpen, node, groupId, onOpenChange, onSuccess }: RenameNodeModalProps) {
  const driveService = useDriveService();
  const [name, setName] = useState(getDefaultName(node));

  /**
   * 执行时机：弹窗打开并绑定目标节点时，同步输入框默认名称。
   * 不可替代原因：弹窗组件常驻挂载，useState 初始值不会随右栏选中节点变化而重置。
   * cleanup：没有订阅或异步资源需要释放。
   */
  useEffectForce(() => {
    if (!isOpen) return;
    setName(getDefaultName(node));
  }, [isOpen, node?.id]);

  const { loading, run: runRenameNode } = useRequest(
    async (trimmed: string) => {
      if (!node) return;
      await driveService.renameNode({ nodeId: node.id, newName: trimmed, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('重命名成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (!node) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('请输入名称');
      return;
    }
    runRenameNode(trimmed);
  };

  const title = node?.type === 'folder' ? '重命名文件夹' : '重命名文件';

  return (
    <AppFormDialog
      isOpen={isOpen && !!node}
      onOpenChange={onOpenChange}
      title={title}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      isDismissable={!loading}
    >
      <TextField
        aria-label="节点名称"
        className={styles.input}
        value={name}
        autoFocus
        onChange={setName}
      >
        <Input placeholder="请输入新名称" />
      </TextField>
    </AppFormDialog>
  );
}

export default RenameNodeModal;
