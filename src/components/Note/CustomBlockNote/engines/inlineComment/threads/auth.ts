import type { CommentData, CommentReactionData, ThreadData } from '@blocknote/core/comments';
import { ThreadStoreAuth } from '@blocknote/core/comments';

import { getThreadInlineComments } from './presentation';

/** 与 BlockNote 默认权限模型一致的文档评论角色。 */
export type BlockNoteInlineCommentDocumentRole = 'comment' | 'editor';

function isThreadAuthor(thread: ThreadData, userId: string): boolean {
  return getThreadInlineComments(thread)[0]?.userId === userId;
}

function getCommentReactions(comment: CommentData): CommentData['reactions'] {
  return Array.isArray(comment.reactions) ? comment.reactions : [];
}

function hasReactionUser(reaction: CommentReactionData, userId: string): boolean {
  return Array.isArray(reaction.userIds) && reaction.userIds.includes(userId);
}

/** 只展示已有批注，不允许创建、回复、删除、解决或表情反应。 */
export class ReadOnlyThreadStoreAuth extends ThreadStoreAuth {
  canCreateThread() {
    return false;
  }

  canAddComment(_thread: ThreadData) {
    return false;
  }

  canUpdateComment(_comment: CommentData) {
    return false;
  }

  canDeleteComment(_comment: CommentData) {
    return false;
  }

  canDeleteThread(_thread: ThreadData) {
    return false;
  }

  canResolveThread(_thread: ThreadData) {
    return false;
  }

  canUnresolveThread(_thread: ThreadData) {
    return false;
  }

  canAddReaction(_comment: CommentData, _emoji?: string) {
    return false;
  }

  canDeleteReaction(_comment: CommentData, _emoji?: string) {
    return false;
  }
}

export class WisePenThreadStoreAuth extends ThreadStoreAuth {
  private readonly getUserId: () => string;
  private readonly role: BlockNoteInlineCommentDocumentRole;
  private readonly isPrivileged: boolean;

  constructor(
    getUserId: () => string,
    role: BlockNoteInlineCommentDocumentRole,
    isPrivileged: boolean
  ) {
    super();
    this.getUserId = getUserId;
    this.role = role;
    this.isPrivileged = isPrivileged;
  }

  canCreateThread(): boolean {
    return true;
  }

  canAddComment(_thread: ThreadData): boolean {
    return true;
  }

  canUpdateComment(comment: CommentData): boolean {
    return comment.userId === this.getUserId();
  }

  canDeleteThread(thread: ThreadData): boolean {
    return (
      this.isPrivileged || (this.role === 'editor' && isThreadAuthor(thread, this.getUserId()))
    );
  }

  canDeleteComment(comment: CommentData): boolean {
    return this.isPrivileged || comment.userId === this.getUserId();
  }

  canResolveThread(thread: ThreadData): boolean {
    return this.isPrivileged || isThreadAuthor(thread, this.getUserId());
  }

  canUnresolveThread(thread: ThreadData): boolean {
    return this.isPrivileged || isThreadAuthor(thread, this.getUserId());
  }

  canAddReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return !getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.getUserId())
    );
  }

  canDeleteReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.getUserId())
    );
  }
}
