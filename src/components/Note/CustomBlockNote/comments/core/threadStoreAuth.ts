import type { CommentData, CommentReactionData, ThreadData } from '@blocknote/core/comments';
import { ThreadStoreAuth } from '@blocknote/core/comments';

import type { BlockNoteCommentDocumentRole } from '../comments.types';
import { getThreadComments } from './threadReferenceText';

function isThreadAuthor(thread: ThreadData, userId: string): boolean {
  return getThreadComments(thread)[0]?.userId === userId;
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
  public userId: string;
  private readonly role: BlockNoteCommentDocumentRole;
  private readonly isPrivileged: boolean;

  constructor(userId: string, role: BlockNoteCommentDocumentRole, isPrivileged: boolean) {
    super();
    this.userId = userId;
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
    return comment.userId === this.userId;
  }

  canDeleteThread(thread: ThreadData): boolean {
    return this.isPrivileged || (this.role === 'editor' && isThreadAuthor(thread, this.userId));
  }

  canDeleteComment(comment: CommentData): boolean {
    return this.isPrivileged || comment.userId === this.userId;
  }

  canResolveThread(thread: ThreadData): boolean {
    return this.isPrivileged || isThreadAuthor(thread, this.userId);
  }

  canUnresolveThread(thread: ThreadData): boolean {
    return this.isPrivileged || isThreadAuthor(thread, this.userId);
  }

  canAddReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return !getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.userId)
    );
  }

  canDeleteReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.userId)
    );
  }
}
