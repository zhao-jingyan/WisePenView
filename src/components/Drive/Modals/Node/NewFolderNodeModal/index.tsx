import { FormField, Input } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { NewFolderNodeModalProps } from './index.type';
import styles from './style.module.less';

function NewFolderNodeModal({
  isOpen,
  parentId,
  groupId,
  parentLabel,
  existingFolderNames = [],
  onOpenChange,
  onSuccess,
}: NewFolderNodeModalProps) {
  const driveService = useDriveService();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const { loading, run: runCreateFolder } = useRequest(
    async (trimmed: string) => driveService.createFolder({ parentId, name: trimmed, groupId }),
    {
      manual: true,
      onSuccess: () => {
        toast.success('新建成功');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('请输入文件夹名称');
      return;
    }
    const validation = validateReservedName(trimmed);
    if (!validation.valid) {
      setNameError(validation.reason ?? '文件夹名称不合法');
      return;
    }
    if (existingFolderNames.includes(trimmed)) {
      setNameError('当前目录下已存在同名文件夹');
      return;
    }
    runCreateFolder(trimmed);
  };

  const handleCancel = () => {
    setName('');
    setNameError('');
    onOpenChange(false);
  };

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
          return;
        }
        onOpenChange(true);
      }}
      title="新建文件夹"
      confirmText="创建"
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      isDismissable={!loading}
    >
      <div className={styles.pathHint}>
        {parentLabel ? `创建到「${parentLabel}」下` : '当前目录'}
      </div>
      <FormField
        aria-label="文件夹名称"
        label="文件夹名称"
        name="folderName"
        className={styles.input}
        value={name}
        autoFocus
        onChange={(value) => {
          setName(value);
          setNameError('');
        }}
        errorMessage={nameError}
        isRequired
      >
        <Input placeholder="请输入文件夹名称" />
      </FormField>
    </AppFormDialog>
  );
}

export default NewFolderNodeModal;
