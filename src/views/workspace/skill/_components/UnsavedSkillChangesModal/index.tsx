import { Button, Modal } from '@heroui/react';

import styles from './style.module.less';

type UnsavedSkillChangesMode = 'publish' | 'leave';

interface UnsavedSkillChangesModalProps {
  isOpen: boolean;
  mode: UnsavedSkillChangesMode;
  isLoading?: boolean;
  onCancel: () => void;
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
};

function UnsavedSkillChangesModal({
  isOpen,
  mode,
  isLoading = false,
  onCancel,
  onConfirm,
}: UnsavedSkillChangesModalProps) {
  const copy = modalCopy[mode];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open && !isLoading) onCancel();
      }}
    >
      <Modal.Backdrop isDismissable={!isLoading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog className={styles.dialog}>
            <Modal.Header>
              <Modal.Heading>{copy.title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className={styles.body}>
              <p className={styles.description}>{copy.description}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onCancel} isDisabled={isLoading}>
                取消
              </Button>
              <Button variant="primary" onPress={onConfirm} isDisabled={isLoading}>
                {copy.confirmText}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default UnsavedSkillChangesModal;
