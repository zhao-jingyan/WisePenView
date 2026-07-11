import type { WisePenCommentsSidebarProps } from './index.type';
import styles from './style.module.less';
import { WisePenThreadCard } from './WisePenThreadCard';

export function WisePenCommentsSidebar({
  threads,
  className,
  selectedThreadId,
  maxCommentsBeforeCollapse,
  actionMode = 'default',
  actionsEnabled = false,
  emptyText = '暂无批注',
  canReopenThread,
  onSelectThread,
  onUpdateComment,
  onDeleteComment,
  onResolveThread,
  onReopenThread,
  onReplyThread,
}: WisePenCommentsSidebarProps) {
  const displayableThreads = threads.filter((thread) =>
    thread.comments.some((comment) => !comment.deleted)
  );

  return (
    <div className={`wise-pen-comments-sidebar ${styles.sidebar} ${className ?? ''}`}>
      {displayableThreads.length > 0 ? (
        displayableThreads.map((thread) => (
          <WisePenThreadCard
            key={thread.id}
            thread={thread}
            selected={thread.id === selectedThreadId}
            maxCommentsBeforeCollapse={maxCommentsBeforeCollapse}
            actionMode={actionMode}
            actionsEnabled={actionsEnabled}
            canReopen={canReopenThread?.(thread) ?? false}
            onSelectThread={onSelectThread}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
            onResolveThread={onResolveThread}
            onReopenThread={onReopenThread}
            onReplyThread={onReplyThread}
          />
        ))
      ) : (
        <div className={styles.commentsEmpty}>{emptyText}</div>
      )}
    </div>
  );
}
