import { Button, Tooltip } from '@heroui/react';
import { Check, RotateCcw } from 'lucide-react';
import { Fragment, useState } from 'react';

import { getVisibleComments } from './commentSidebarUtils';
import type { WisePenCommentsSidebarProps, WisePenSidebarThread } from './index.type';
import styles from './style.module.less';
import { WisePenCommentItem } from './WisePenCommentItem';
import { WisePenReplyComposer } from './WisePenReplyComposer';

export function WisePenThreadCard({
  thread,
  selected,
  maxCommentsBeforeCollapse,
  actionMode,
  actionsEnabled,
  canReopen,
  onSelectThread,
  onUpdateComment,
  onDeleteComment,
  onResolveThread,
  onReopenThread,
  onReplyThread,
}: {
  thread: WisePenSidebarThread;
  selected: boolean;
  maxCommentsBeforeCollapse?: number;
  actionMode: NonNullable<WisePenCommentsSidebarProps['actionMode']>;
  actionsEnabled: boolean;
  canReopen: boolean;
  onSelectThread?: WisePenCommentsSidebarProps['onSelectThread'];
  onUpdateComment?: WisePenCommentsSidebarProps['onUpdateComment'];
  onDeleteComment?: WisePenCommentsSidebarProps['onDeleteComment'];
  onResolveThread?: WisePenCommentsSidebarProps['onResolveThread'];
  onReopenThread?: WisePenCommentsSidebarProps['onReopenThread'];
  onReplyThread?: WisePenCommentsSidebarProps['onReplyThread'];
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const isHistoryMode = actionMode === 'history';
  const { comments: visibleComments, hiddenCount } = getVisibleComments(
    thread.comments,
    selected,
    maxCommentsBeforeCollapse
  );
  const canReply = actionsEnabled && !thread.resolved && Boolean(onReplyThread);

  return (
    <article
      className={selected ? styles.threadCardSelected : styles.threadCard}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, textarea, input, [data-ignore-thread-select]')) {
          return;
        }
        onSelectThread?.(thread.id);
      }}
    >
      <header className={styles.threadHeader}>
        <button
          type="button"
          className={styles.threadReference}
          onClick={() => onSelectThread?.(thread.id)}
        >
          {thread.referenceText || '原文已删除'}
        </button>
        <div className={styles.threadQuickActions}>
          {!isHistoryMode && actionsEnabled && !thread.resolved && onResolveThread ? (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.threadQuickActionButton}
                  aria-label="解决批注"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void onResolveThread(thread.id);
                  }}
                >
                  <Check size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>解决批注</Tooltip.Content>
            </Tooltip>
          ) : null}
          {isHistoryMode && thread.resolved && canReopen && onReopenThread ? (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.threadQuickActionButton}
                  aria-label="重新打开"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void onReopenThread(thread.id);
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>重新打开</Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
      </header>
      <div className={styles.threadComments}>
        {visibleComments.map((comment, index) => (
          <Fragment key={comment.id}>
            {index === 1 && hiddenCount > 0 ? (
              <button
                type="button"
                className={styles.hiddenReplies}
                onClick={() => onSelectThread?.(thread.id)}
              >
                还有 {hiddenCount} 条回复
              </button>
            ) : null}
            <WisePenCommentItem
              thread={thread}
              comment={comment}
              actionsEnabled={actionsEnabled}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
            />
          </Fragment>
        ))}
      </div>
      {canReply ? (
        replyOpen ? (
          <WisePenReplyComposer
            thread={thread}
            onCancel={() => setReplyOpen(false)}
            onSubmitted={() => setReplyOpen(false)}
            onReplyThread={onReplyThread}
          />
        ) : (
          <div className={styles.replyCollapsed}>
            <Button size="sm" variant="secondary" onPress={() => setReplyOpen(true)}>
              回复
            </Button>
          </div>
        )
      ) : null}
    </article>
  );
}
