import { Button, Tooltip } from '@heroui/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type {
  WisePenInlineCommentAuthorInfo,
  WisePenInlineCommentData,
  WisePenInlineCommentSidebarProps,
  WisePenInlineCommentThread,
} from './index.type';
import { formatInlineCommentDate } from './inlineCommentSidebarUtils';
import styles from './style.module.less';

function InlineCommentAvatar({ author }: { author: WisePenInlineCommentAuthorInfo }) {
  const name = author.name.trim() || '未知用户';
  const initial = name.slice(0, 1).toUpperCase();

  if (author.avatarUrl) {
    return <img className={styles.inlineCommentAvatar} src={author.avatarUrl} alt={name} />;
  }
  return <span className={styles.inlineCommentAvatarFallback}>{initial}</span>;
}

export function WisePenInlineCommentItem({
  thread,
  inlineComment,
  actionsEnabled,
  onUpdateInlineComment,
  onDeleteInlineComment,
}: {
  thread: WisePenInlineCommentThread;
  inlineComment: WisePenInlineCommentData;
  actionsEnabled: boolean;
  onUpdateInlineComment?: WisePenInlineCommentSidebarProps['onUpdateInlineComment'];
  onDeleteInlineComment?: WisePenInlineCommentSidebarProps['onDeleteInlineComment'];
}) {
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(inlineComment.content);
  const [submitting, setSubmitting] = useState(false);
  const trimmedDraft = draftContent.trim();
  const canUpdate =
    actionsEnabled &&
    !inlineComment.deleted &&
    Boolean(inlineComment.canUpdate) &&
    Boolean(onUpdateInlineComment);
  const canDelete = actionsEnabled && !inlineComment.deleted && Boolean(onDeleteInlineComment);

  const handleStartEdit = () => {
    setDraftContent(inlineComment.content);
    setEditing(true);
  };

  const handleSubmitEdit = async () => {
    if (!trimmedDraft || submitting || !onUpdateInlineComment) {
      return;
    }
    try {
      setSubmitting(true);
      await onUpdateInlineComment(thread.id, inlineComment.id, trimmedDraft);
      setEditing(false);
    } catch {
      // 错误提示由上层领域组件统一处理，这里保留编辑态方便用户重试。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.inlineCommentItem}>
      <InlineCommentAvatar author={inlineComment.author} />
      <div className={styles.inlineCommentMain}>
        <div className={styles.inlineCommentHeader}>
          <span className={styles.inlineCommentAuthor}>
            {inlineComment.author.name || '未知用户'}
          </span>
          <span className={styles.inlineCommentTime}>
            {formatInlineCommentDate(inlineComment.createdAt)}
          </span>
        </div>
        {editing ? (
          <div className={styles.inlineCommentEditComposer} data-ignore-thread-select>
            <textarea
              className={styles.replyInput}
              value={draftContent}
              rows={2}
              onChange={(event) => setDraftContent(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmitEdit();
                }
              }}
            />
            <div className={styles.replyActions}>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={submitting}
                onPress={() => setEditing(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                variant="primary"
                isDisabled={!trimmedDraft || trimmedDraft === inlineComment.content.trim()}
                isPending={submitting}
                onPress={() => void handleSubmitEdit()}
              >
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.inlineCommentBody}>{inlineComment.content || '空批注'}</div>
        )}
      </div>
      {canUpdate || canDelete ? (
        <div className={styles.inlineCommentQuickActions}>
          {canUpdate ? (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.threadQuickActionButton}
                  aria-label="编辑批注"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleStartEdit();
                  }}
                >
                  <Pencil size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>编辑批注</Tooltip.Content>
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.threadQuickActionButton}
                  aria-label="删除批注"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void onDeleteInlineComment?.(thread.id, inlineComment.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>删除批注</Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
