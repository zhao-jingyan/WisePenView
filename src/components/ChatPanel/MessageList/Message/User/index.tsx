import CopyButton from '@/components/Button/CopyButton';
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
import { isTextUIPart } from 'ai';
import MessageContent from '../Content';
import styles from './style.module.less';

function UserMessage({ message }: { message: WisePenUIMessage }) {
  const content = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const attachments = message.metadata?.selectedAttachments ?? [];

  return (
    <div className={styles.row}>
      <div className={styles.content}>
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
            <CopyButton text={content} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default UserMessage;
