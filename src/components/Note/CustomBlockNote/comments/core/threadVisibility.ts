import type { ThreadData } from '@blocknote/core/comments';

import type { CollaboratorCommentVisibility } from './commentSettings';
import { getThreadComments } from './threadReferenceText';

export type ThreadVisibilityContext = {
  currentUserId: string;
  isPrivileged: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
};

/** 判断当前用户是否参与了该 thread（创建或回复） */
function isUserParticipantInThread(thread: ThreadData, userId: string): boolean {
  if (!userId) {
    return false;
  }
  return getThreadComments(thread).some((comment) => comment.userId === userId);
}

/**
 * 侧栏 / 历史批注列表 / 正文高亮可见性：
 * - 特权身份（所有者、组内管理员）始终可见全部
 * - collaboratorVisibility=all 时全员可见全部
 * - own_only 时非特权用户仅见自己参与的 thread
 */
function isThreadVisibleToUser(thread: ThreadData, context: ThreadVisibilityContext): boolean {
  if (thread.deletedAt) {
    return false;
  }
  if (context.isPrivileged || context.collaboratorVisibility === 'all') {
    return true;
  }
  return isUserParticipantInThread(thread, context.currentUserId);
}

export function filterThreadsByVisibility(
  threads: Iterable<ThreadData>,
  context: ThreadVisibilityContext
): ThreadData[] {
  return Array.from(threads).filter((thread) => isThreadVisibleToUser(thread, context));
}

/** 当前用户不可见的 thread id，供正文 mark / 公式高亮过滤 */
export function getHiddenThreadIdsForUser(
  threads: Iterable<ThreadData>,
  context: ThreadVisibilityContext
): Set<string> {
  if (context.isPrivileged || context.collaboratorVisibility === 'all') {
    return new Set();
  }
  // 用户身份尚未就绪时不隐藏，避免把全部 mark 误标为 orphan 导致高亮消失
  if (!context.currentUserId) {
    return new Set();
  }

  const hidden = new Set<string>();
  for (const thread of threads) {
    if (thread.deletedAt) {
      continue;
    }
    if (!isUserParticipantInThread(thread, context.currentUserId)) {
      hidden.add(thread.id);
    }
  }
  return hidden;
}
