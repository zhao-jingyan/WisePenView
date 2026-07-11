import type { Message } from '@/components/ChatPanel/index.type';
import { Button, toast } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import MessageContent from './MessageContent';
import styles from './UserMessage.module.less';

interface UserMessageProps {
  message: Message;
  onEdit?: (content: string) => void;
}

function UserMessage({ message }: UserMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.danger('复制失败');
    }
  };

  return (
    <div className={styles.userRow}>
      <div className={styles.contentCol}>
        {/* 左侧悬浮操作栏 */}
        <div className={styles.actions}>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
            onPress={handleCopy}
            aria-label="复制"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>

        {/* 气泡 */}
        <div className={styles.bubble}>
          <MessageContent content={message.content} />
        </div>
      </div>
    </div>
  );
}

export default UserMessage;
