import type { ResourceComment } from '@/domains/Interact';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Avatar, Button, Tooltip } from '@heroui/react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import styles from './style.module.less';
import { getAuthorInitial, hasVisibleCommentContent } from './utils';

interface ResourceCommentItemProps {
  comment: ResourceComment;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  liked: boolean;
  likePending: boolean;
  onReply(comment: ResourceComment): void;
  onLike(comment: ResourceComment): Promise<boolean>;
  onDelete(comment: ResourceComment): void;
  onPreviewImage(url: string): void;
}

function ResourceCommentItem({
  comment,
  currentUserId,
  resourceOwnerId,
  liked,
  likePending,
  onReply,
  onLike,
  onDelete,
  onPreviewImage,
}: ResourceCommentItemProps) {
  const canDelete = currentUserId === comment.authorId || currentUserId === resourceOwnerId;
  const timeText = formatTimestampToDateTime(comment.createTime) || '时间未知';
  const commentDate = new Date(comment.createTime);
  const dateTime = Number.isFinite(commentDate.getTime()) ? commentDate.toISOString() : undefined;

  return (
    <article className={styles.commentItem}>
      <Avatar aria-label={comment.author.name} className={styles.avatar}>
        {comment.author.avatar ? (
          <Avatar.Image src={comment.author.avatar} alt={comment.author.name} />
        ) : null}
        <Avatar.Fallback>{getAuthorInitial(comment.author.name)}</Avatar.Fallback>
      </Avatar>

      <div className={styles.commentBody}>
        <div className={styles.authorLine}>
          <strong>{comment.author.name}</strong>
          {comment.replyToUser ? <span>回复 {comment.replyToUser.name}</span> : null}
        </div>

        {comment.deleted ? (
          <p className={styles.deletedText}>该评论已删除</p>
        ) : (
          <>
            {hasVisibleCommentContent(comment.content) ? (
              <p className={styles.commentContent}>{comment.content}</p>
            ) : null}
            {comment.imageUrls.length > 0 ? (
              <div className={styles.commentImages}>
                {comment.imageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={styles.commentImageButton}
                    aria-label="预览评论图片"
                    onClick={() => onPreviewImage(url)}
                  >
                    <img src={url} alt="评论图片" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        <div className={styles.commentMeta}>
          <time dateTime={dateTime}>{timeText}</time>
          {!comment.deleted ? (
            <div className={styles.commentActions}>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={`回复 ${comment.author.name}`}
                    onPress={() => onReply(comment)}
                  >
                    <MessageCircle size={14} aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>回复</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={liked ? styles.likedButton : undefined}
                    isDisabled={likePending}
                    aria-label={liked ? '取消点赞' : '点赞'}
                    onPress={() => void onLike(comment)}
                  >
                    <Heart size={14} aria-hidden fill={liked ? 'currentColor' : 'none'} />
                    {comment.likeCount > 0 ? comment.likeCount : null}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{liked ? '取消点赞' : '点赞'}</Tooltip.Content>
              </Tooltip>
              {canDelete ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="删除评论"
                      onPress={() => onDelete(comment)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>删除</Tooltip.Content>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ResourceCommentItem;
