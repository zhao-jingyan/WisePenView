import type { WisePenInlineCommentSidebarProps } from './index.type';
import styles from './style.module.less';
import { WisePenInlineCommentThreadCard } from './WisePenInlineCommentThreadCard';

export function WisePenInlineCommentSidebar({
  threads,
  className,
  selectedThreadId,
  maxInlineCommentsBeforeCollapse,
  actionMode = 'default',
  actionsEnabled = false,
  emptyText = '暂无批注',
  canReopenThread,
  onSelectThread,
  onUpdateInlineComment,
  onDeleteInlineComment,
  onResolveThread,
  onReopenThread,
  onReplyThread,
}: WisePenInlineCommentSidebarProps) {
  const displayableThreads = threads.filter((thread) =>
    thread.inlineComments.some((inlineComment) => !inlineComment.deleted)
  );

  return (
    <div className={`wise-pen-inline-comment-sidebar ${styles.sidebar} ${className ?? ''}`}>
      {displayableThreads.length > 0 ? (
        displayableThreads.map((thread) => (
          <WisePenInlineCommentThreadCard
            key={thread.id}
            thread={thread}
            selected={thread.id === selectedThreadId}
            maxInlineCommentsBeforeCollapse={maxInlineCommentsBeforeCollapse}
            actionMode={actionMode}
            actionsEnabled={actionsEnabled}
            canReopen={canReopenThread?.(thread) ?? false}
            onSelectThread={onSelectThread}
            onUpdateInlineComment={onUpdateInlineComment}
            onDeleteInlineComment={onDeleteInlineComment}
            onResolveThread={onResolveThread}
            onReopenThread={onReopenThread}
            onReplyThread={onReplyThread}
          />
        ))
      ) : (
        <div className={styles.inlineCommentsEmpty}>{emptyText}</div>
      )}
    </div>
  );
}
