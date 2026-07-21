import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { copyText } from '@/utils/browser/copyText';
import { toast } from '@heroui/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import type { InviteUserModalProps } from './index.type';
import styles from './style.module.less';

function InviteUserModal({ isOpen, onOpenChange, inviteCode }: InviteUserModalProps) {
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setCopied(false);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleCopy = async () => {
    const copied = await copyText(inviteCode ?? '');
    if (copied) {
      setCopied(true);
      toast.success('邀请码已复制到剪贴板');
      return;
    }

    toast.danger('复制失败，请手动复制');
  };

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="邀请用户"
      secondaryAction={{
        label: '关闭',
        onPress: handleClose,
      }}
      primaryAction={{
        label: copied ? '已复制' : '复制',
        icon: <Copy size={16} aria-hidden="true" />,
        onPress: handleCopy,
        isDisabled: !inviteCode,
      }}
    >
      <div className={styles.inviteContainer}>
        <div className={styles.inviteCodeWrap}>
          <div className={styles.inviteCode}>{inviteCode ?? '暂无邀请码'}</div>
        </div>
        <div className={styles.inviteHint}>分享此邀请码给其他用户，他们可以使用此码加入小组</div>
      </div>
    </AppDisplayDialog>
  );
}

export default InviteUserModal;
