import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { Button } from '@heroui/react';

export type UnsavedSkillChangesMode =
  'publish' | 'leave' | 'switchFile' | 'switchConfig' | 'switchVersion';

interface UnsavedSkillChangesModalProps {
  isOpen: boolean;
  mode: UnsavedSkillChangesMode;
  isLoading?: boolean;
  onCancel: () => void;
  onDiscard?: () => void;
  onConfirm: () => void;
}

const modalCopy: Record<
  UnsavedSkillChangesMode,
  {
    title: string;
    description: string;
    confirmText: string;
  }
> = {
  publish: {
    title: '发布前保存修改',
    description: '当前 Skill 有未保存修改。发布前需要先保存，否则本次修改不会进入发布版本。',
    confirmText: '保存并发布',
  },
  leave: {
    title: '保存后离开页面？',
    description: '当前 Skill 有未保存修改。保存后再离开可避免丢失本次编辑。',
    confirmText: '保存并退出',
  },
  switchFile: {
    title: '保存后切换文件？',
    description: '当前文件有未保存修改。保存后再切换可避免丢失本次编辑。',
    confirmText: '保存并切换',
  },
  switchConfig: {
    title: '保存后打开配置？',
    description: '当前文件有未保存修改。保存后再打开配置可避免丢失本次编辑。',
    confirmText: '保存并打开',
  },
  switchVersion: {
    title: '保存后切换版本？',
    description: '当前 Skill 有未保存内容。保存后再切换版本可避免丢失本次编辑。',
    confirmText: '保存并切换',
  },
};

function UnsavedSkillChangesModal({
  isOpen,
  mode,
  isLoading = false,
  onCancel,
  onDiscard,
  onConfirm,
}: UnsavedSkillChangesModalProps) {
  const copy = modalCopy[mode];
  const actions = onDiscard ? (
    <>
      <Button variant="secondary" isDisabled={isLoading} onPress={onCancel}>
        取消
      </Button>
      <Button variant="secondary" isDisabled={isLoading} onPress={onDiscard}>
        放弃更改
      </Button>
      <Button variant="primary" isDisabled={isLoading} aria-busy={isLoading} onPress={onConfirm}>
        {copy.confirmText}
      </Button>
    </>
  ) : undefined;

  return (
    <AppAlertDialog
      type="confirm"
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open && !isLoading) onCancel();
      }}
      title={copy.title}
      description={copy.description}
      confirmText={copy.confirmText}
      actions={actions}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isConfirmLoading={isLoading}
      isDismissable={!isLoading}
    />
  );
}

export default UnsavedSkillChangesModal;
