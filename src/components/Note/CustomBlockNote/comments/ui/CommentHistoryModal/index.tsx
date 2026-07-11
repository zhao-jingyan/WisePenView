import { Button } from '@heroui/react';

import AppModal from '@/components/Overlay/AppModal';
import type { CommentHistoryModalProps } from './index.type';
import styles from './style.module.less';

function CommentHistoryModal({ isOpen, onOpenChange, children }: CommentHistoryModalProps) {
  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="历史批注"
      size="lg"
      bodyClassName={styles.historyBody}
      actions={
        <Button variant="secondary" onPress={() => onOpenChange(false)}>
          关闭
        </Button>
      }
    >
      {children ? (
        <div className={styles.historyContent}>{children}</div>
      ) : (
        <p className={styles.placeholder}>已解决的批注会在这里展示。</p>
      )}
    </AppModal>
  );
}

export default CommentHistoryModal;
