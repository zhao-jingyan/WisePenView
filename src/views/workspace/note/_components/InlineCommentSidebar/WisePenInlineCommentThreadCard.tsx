import { Button, Tooltip } from '@heroui/react';
import { Check, RotateCcw } from 'lucide-react';
import { Fragment, useState } from 'react';

import type { WisePenInlineCommentSidebarProps, WisePenInlineCommentThread } from './index.type';
import { getVisibleInlineComments } from './inlineCommentSidebarUtils';
import styles from './style.module.less';
import { WisePenInlineCommentItem } from './WisePenInlineCommentItem';
import { WisePenInlineCommentReplyComposer } from './WisePenInlineCommentReplyComposer';

export function WisePenInlineCommentThreadCard({
  thread,
  selected,
  maxInlineCommentsBeforeCollapse,
  actionMode,
  actionsEnabled,
  canReopen,
  onSelectThread,
  onUpdateInlineComment,
  onDeleteInlineComment,
  onResolveThread,
  onReopenThread,
  onReplyThread,
}: {
  thread: WisePenInlineCommentThread;
  selected: boolean;
  maxInlineCommentsBeforeCollapse?: number;
  actionMode: NonNullable<WisePenInlineCommentSidebarProps['actionMode']>;
  actionsEnabled: boolean;
  canReopen: boolean;
  onSelectThread?: WisePenInlineCommentSidebarProps['onSelectThread'];
  onUpdateInlineComment?: WisePenInlineCommentSidebarProps['onUpdateInlineComment'];
  onDeleteInlineComment?: WisePenInlineCommentSidebarProps['onDeleteInlineComment'];
  onResolveThread?: WisePenInlineCommentSidebarProps['onResolveThread'];
  onReopenThread?: WisePenInlineCommentSidebarProps['onReopenThread'];
  onReplyThread?: WisePenInlineCommentSidebarProps['onReplyThread'];
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const isHistoryMode = actionMode === 'history';
  const { inlineComments: visibleInlineComments, hiddenCount } = getVisibleInlineComments(
    thread.inlineComments,
    selected,
    maxInlineCommentsBeforeCollapse
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
      <div className={styles.threadInlineComments}>
        {visibleInlineComments.map((inlineComment, index) => (
          <Fragment key={inlineComment.id}>
            {index === 1 && hiddenCount > 0 ? (
              <button
                type="button"
                className={styles.hiddenReplies}
                onClick={() => onSelectThread?.(thread.id)}
              >
                还有 {hiddenCount} 条回复
              </button>
            ) : null}
            <WisePenInlineCommentItem
              thread={thread}
              inlineComment={inlineComment}
              actionsEnabled={actionsEnabled}
              onUpdateInlineComment={onUpdateInlineComment}
              onDeleteInlineComment={onDeleteInlineComment}
            />
          </Fragment>
        ))}
      </div>
      {canReply ? (
        replyOpen ? (
          <WisePenInlineCommentReplyComposer
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
