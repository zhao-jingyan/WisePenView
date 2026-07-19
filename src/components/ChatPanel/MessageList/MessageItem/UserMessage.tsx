import EntryIcon from '@/components/Icons/EntryIcon';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { Button, toast } from '@heroui/react';
import { isTextUIPart } from 'ai';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import inputStyles from '../../ChatInput/style.module.less';
import MessageContent from './MessageContent';
import styles from './UserMessage.module.less';

const MESSAGE_ACTION_ICON_SIZE = 17;

function UserMessage({ message }: { message: WisePenUIMessage }) {
  const [copied, setCopied] = useState(false);
  const content = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const attachments = message.metadata?.selectedAttachments ?? [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
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
        <div className={styles.bubbleWrap}>
          {attachments.length > 0 ? (
            <AttachmentGroup className={styles.attachments} aria-label="消息附件">
              {attachments.map((attachment) => (
                <Attachment
                  key={attachment.attachmentId}
                  size="xs"
                  state={attachment.available ? 'done' : 'error'}
                  className={styles.attachment}
                >
                  <AttachmentMedia>
                    <EntryIcon entryType="resource" resourceName={attachment.filename} size={14} />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle title={attachment.filename}>
                      {attachment.filename}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      {attachment.available
                        ? attachment.kind === 'resource'
                          ? '资源附件'
                          : '附件'
                        : '附件已不可用'}
                    </AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
              ))}
            </AttachmentGroup>
          ) : null}

          {content ? (
            <div className={styles.bubble}>
              <MessageContent content={content} />
            </div>
          ) : null}

          {content ? (
            <div className={styles.actions}>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                className={clsx(
                  inputStyles.toolbarCircleBtn,
                  styles.actionBtn,
                  copied && styles.actionBtnCopied
                )}
                onPress={handleCopy}
                aria-label="复制"
              >
                {copied ? (
                  <Check size={MESSAGE_ACTION_ICON_SIZE} />
                ) : (
                  <Copy size={MESSAGE_ACTION_ICON_SIZE} />
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UserMessage;
