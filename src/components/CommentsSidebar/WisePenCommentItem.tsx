import { Button, Tooltip } from '@heroui/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { formatCommentDate, isCommentEdited } from './commentSidebarUtils';
import type {
  WisePenCommentAuthorInfo,
  WisePenCommentsSidebarProps,
  WisePenSidebarComment,
  WisePenSidebarThread,
} from './index.type';
import styles from './style.module.less';

function CommentAvatar({ author }: { author: WisePenCommentAuthorInfo }) {
  const name = author.name.trim() || '未知用户';
  const initial = name.slice(0, 1).toUpperCase();

  if (author.avatarUrl) {
    return <img className={styles.commentAvatar} src={author.avatarUrl} alt={name} />;
  }
  return <span className={styles.commentAvatarFallback}>{initial}</span>;
}

export function WisePenCommentItem({
  thread,
  comment,
  actionsEnabled,
  onUpdateComment,
  onDeleteComment,
}: {
  thread: WisePenSidebarThread;
  comment: WisePenSidebarComment;
  actionsEnabled: boolean;
  onUpdateComment?: WisePenCommentsSidebarProps['onUpdateComment'];
  onDeleteComment?: WisePenCommentsSidebarProps['onDeleteComment'];
}) {
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);
  const trimmedDraft = draftContent.trim();
  const canUpdate =
    actionsEnabled && !comment.deleted && Boolean(comment.canUpdate) && Boolean(onUpdateComment);
  const canDelete = actionsEnabled && !comment.deleted && Boolean(onDeleteComment);

  const handleStartEdit = () => {
    setDraftContent(comment.content);
    setEditing(true);
  };

  const handleSubmitEdit = async () => {
    if (!trimmedDraft || submitting || !onUpdateComment) {
      return;
    }
    try {
      setSubmitting(true);
      await onUpdateComment(thread.id, comment.id, trimmedDraft);
      setEditing(false);
    } catch {
      // 错误提示由上层领域组件统一处理，这里保留编辑态方便用户重试。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.commentItem}>
      <CommentAvatar author={comment.author} />
      <div className={styles.commentMain}>
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>{comment.author.name || '未知用户'}</span>
          <span className={styles.commentTime}>
            {formatCommentDate(comment.createdAt)}
            {isCommentEdited(comment) ? '（已编辑）' : ''}
          </span>
        </div>
        {editing ? (
          <div className={styles.commentEditComposer} data-ignore-thread-select>
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
                isDisabled={!trimmedDraft || trimmedDraft === comment.content.trim()}
                isPending={submitting}
                onPress={() => void handleSubmitEdit()}
              >
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.commentBody}>{comment.content || '空批注'}</div>
        )}
      </div>
      {canUpdate || canDelete ? (
        <div className={styles.commentQuickActions}>
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
                    void onDeleteComment?.(thread.id, comment.id);
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
