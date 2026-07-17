import type {
  InlineCommentDraft,
  InlineCommentSession,
  InlineCommentThread,
} from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { createUuid } from '@/utils/random/createUuid';
import { Avatar, Button, TextArea, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { MessageSquareReply, Send, X } from 'lucide-react';
import { useState, useSyncExternalStore, type KeyboardEvent } from 'react';

import styles from './style.module.less';

interface InlineCommentPanelProps {
  session: InlineCommentSession;
  draft?: InlineCommentDraft;
  activeThreadId?: string;
  onDraftClose(): void;
  onThreadSelect(threadId: string): void;
}

function getAuthorInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function InlineCommentComposer({
  quoteText,
  placeholder,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  quoteText?: string;
  placeholder: string;
  submitLabel: string;
  onCancel(): void;
  onSubmit(content: string, idempotencyKey: string): Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [idempotencyKey] = useState(createUuid);
  const { loading, run: submit } = useRequest(
    async () => {
      const normalizedContent = content.trim();
      if (!normalizedContent) return;
      await onSubmit(normalizedContent, idempotencyKey);
      setContent('');
    },
    {
      manual: true,
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className={styles.composer}>
      {quoteText ? <blockquote className={styles.composerQuote}>{quoteText}</blockquote> : null}
      <TextArea
        value={content}
        rows={3}
        autoFocus
        disabled={loading}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.composerActions}>
        <Button variant="ghost" size="sm" isDisabled={loading} onPress={onCancel}>
          取消
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!content.trim() || loading}
          onPress={submit}
        >
          <Send size={14} aria-hidden />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function InlineCommentThreadItem({
  thread,
  active,
  onSelect,
  onReply,
}: {
  thread: InlineCommentThread;
  active: boolean;
  onSelect(): void;
  onReply(): void;
}) {
  return (
    <article className={`${styles.thread} ${active ? styles.threadActive : ''}`}>
      <button type="button" className={styles.quoteButton} onClick={onSelect}>
        <span className={styles.quoteText}>{thread.quoteText}</span>
      </button>
      <div className={styles.commentList}>
        {thread.items.map((comment) => (
          <div key={comment.commentId} className={styles.comment}>
            <Avatar aria-label={comment.author.name} className={styles.avatar}>
              {comment.author.avatar ? (
                <Avatar.Image src={comment.author.avatar} alt={comment.author.name} />
              ) : null}
              <Avatar.Fallback>{getAuthorInitial(comment.author.name)}</Avatar.Fallback>
            </Avatar>
            <div className={styles.commentBody}>
              <div className={styles.commentHeader}>
                <strong>{comment.author.name}</strong>
                <time>{formatTimestampToDateTime(comment.createdAt) || '时间未知'}</time>
              </div>
              <p>{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className={styles.replyButton} onPress={onReply}>
        <MessageSquareReply size={14} aria-hidden />
        回复
      </Button>
    </article>
  );
}

function InlineCommentPanel({
  session,
  draft,
  activeThreadId,
  onDraftClose,
  onThreadSelect,
}: InlineCommentPanelProps) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [replyThreadId, setReplyThreadId] = useState<string>();
  const replyThread = replyThreadId
    ? snapshot.threads.find((thread) => thread.threadId === replyThreadId)
    : undefined;

  return (
    <div className={styles.panel}>
      <div className={styles.threadList}>
        {snapshot.loading && snapshot.threads.length === 0 ? (
          <p className={styles.stateText}>正在加载批注...</p>
        ) : null}
        {snapshot.error ? (
          <p className={styles.errorText}>{parseErrorMessage(snapshot.error)}</p>
        ) : null}
        {!snapshot.loading && !snapshot.error && snapshot.threads.length === 0 && !draft ? (
          <p className={styles.stateText}>还没有行内批注</p>
        ) : null}
        {snapshot.threads.map((thread) => (
          <InlineCommentThreadItem
            key={thread.threadId}
            thread={thread}
            active={thread.threadId === activeThreadId}
            onSelect={() => onThreadSelect(thread.threadId)}
            onReply={() => {
              onThreadSelect(thread.threadId);
              setReplyThreadId(thread.threadId);
            }}
          />
        ))}
      </div>

      {draft ? (
        <div className={styles.composerDock}>
          <div className={styles.composerTitle}>
            <span>新建批注</span>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="关闭批注编辑器"
              onPress={onDraftClose}
            >
              <X size={15} aria-hidden />
            </Button>
          </div>
          <InlineCommentComposer
            key={`draft:${draft.anchor.start}:${draft.anchor.end}`}
            quoteText={draft.quoteText}
            placeholder="写下批注内容"
            submitLabel="发布"
            onCancel={onDraftClose}
            onSubmit={async (content, idempotencyKey) => {
              const thread = await session.createThread({ ...draft, content, idempotencyKey });
              onThreadSelect(thread.threadId);
              onDraftClose();
            }}
          />
        </div>
      ) : replyThread ? (
        <div className={styles.composerDock}>
          <InlineCommentComposer
            key={`reply:${replyThread.threadId}`}
            quoteText={replyThread.quoteText}
            placeholder="回复这条批注"
            submitLabel="回复"
            onCancel={() => setReplyThreadId(undefined)}
            onSubmit={async (content, idempotencyKey) => {
              await session.addComment(replyThread.threadId, content, idempotencyKey);
              setReplyThreadId(undefined);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default InlineCommentPanel;
