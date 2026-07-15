import type { CommentData, ThreadData } from '@blocknote/core/comments';
import { CommentsExtension } from '@blocknote/core/comments';
import { useExtension, useExtensionState } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';
import type { Doc } from 'yjs';

import {
  WisePenInlineCommentSidebar,
  type WisePenInlineCommentAuthorInfo,
  type WisePenInlineCommentThread,
} from '@/views/workspace/note/_components/InlineCommentSidebar';
import type { CustomBlockNoteEditor } from '../../../../noteEditorComposition';
import {
  buildTextInlineCommentBody,
  buildThreadSnapshot,
  extractPlainTextFromInlineCommentBody,
} from '../../threads/RemoteInlineCommentThreadStore';
import {
  filterInlineCommentThreadsByResolvedState,
  getInlineCommentThreadReferenceText,
  sortInlineCommentThreads,
  type InlineCommentResolvedFilter,
  type ThreadPosition,
} from '../../threads/presentation';
import { getBlockNoteThreadsYMap } from '../../threads/yjs';
import {
  filterInlineCommentThreadsByVisibility,
  type InlineCommentVisibilityScope,
} from '../../visibility/filter';

type InlineCommentThreadsSidebarProps = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  inlineCommentThreadPositions?: Map<string, ThreadPosition>;
  visibilityScope: InlineCommentVisibilityScope;
  filter?: InlineCommentResolvedFilter;
  sort?: 'position' | 'recent-activity' | 'oldest';
  maxInlineCommentsBeforeCollapse?: number;
  actionMode?: 'default' | 'history';
  canReopenThread?: (thread: ThreadData) => boolean;
  actionsEnabled?: boolean;
  resolveInlineCommentUser: (
    userId: string,
    comment: CommentData,
    source: 'author' | 'reaction'
  ) => WisePenInlineCommentAuthorInfo;
};

function isDeletedInlineComment(comment: CommentData): boolean {
  return Boolean(comment.deletedAt);
}

function mapThreadToSidebarThread(
  thread: ThreadData,
  referenceText: string,
  currentUserId: string,
  resolveInlineCommentUser: InlineCommentThreadsSidebarProps['resolveInlineCommentUser']
): WisePenInlineCommentThread {
  return {
    id: thread.id,
    referenceText,
    resolved: thread.resolved,
    inlineComments: thread.comments.map((inlineComment) => ({
      id: inlineComment.id,
      author: resolveInlineCommentUser(inlineComment.userId, inlineComment, 'author'),
      createdAt: inlineComment.createdAt,
      updatedAt: inlineComment.updatedAt,
      content: extractPlainTextFromInlineCommentBody(inlineComment.body),
      reactions: (inlineComment.reactions ?? []).flatMap((reaction) =>
        reaction.userIds.map((userId) => ({
          id: `${inlineComment.id}:${reaction.emoji}:${userId}`,
          emojiId: reaction.emoji,
          user: resolveInlineCommentUser(userId, inlineComment, 'reaction'),
          reactedByCurrentUser: userId === currentUserId,
        }))
      ),
      deleted: isDeletedInlineComment(inlineComment),
      canUpdate: inlineComment.userId === currentUserId,
    })),
  };
}

export function InlineCommentThreadsSidebar({
  editor,
  doc,
  localThreadReferenceTexts,
  inlineCommentThreadPositions = new Map(),
  visibilityScope,
  filter = 'open',
  sort = 'position',
  maxInlineCommentsBeforeCollapse,
  actionMode = 'default',
  canReopenThread,
  actionsEnabled = false,
  resolveInlineCommentUser,
}: InlineCommentThreadsSidebarProps) {
  const commentsExtension = useExtension(CommentsExtension);
  const { selectedThreadId, threadPositions } = useExtensionState(CommentsExtension, { editor });
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const [threads, setThreads] = useState(() => buildThreadSnapshot(threadsYMap));
  const detachThreadsObserverRef = useRef<(() => void) | null>(null);
  const syncThreads = useMemoizedFn(() => {
    setThreads(buildThreadSnapshot(threadsYMap));
  });

  const attachThreadsObserver = useMemoizedFn(() => {
    detachThreadsObserverRef.current?.();
    syncThreads();
    threadsYMap.observeDeep(syncThreads);
    detachThreadsObserverRef.current = () => {
      threadsYMap.unobserveDeep(syncThreads);
      detachThreadsObserverRef.current = null;
    };
  });

  useMount(() => {
    attachThreadsObserver();
  });

  useUpdateEffect(() => {
    attachThreadsObserver();
    return () => {
      detachThreadsObserverRef.current?.();
    };
  }, [attachThreadsObserver, threadsYMap]);

  useUnmount(() => {
    detachThreadsObserverRef.current?.();
  });

  const mergedThreadPositions = new Map(threadPositions);
  inlineCommentThreadPositions.forEach((position, threadId) => {
    if (!mergedThreadPositions.has(threadId)) {
      mergedThreadPositions.set(threadId, position);
    }
  });

  const visibleThreads = filterInlineCommentThreadsByVisibility(threads.values(), visibilityScope);
  const resolvedFiltered = filterInlineCommentThreadsByResolvedState(visibleThreads, filter);
  const sortedThreads = sortInlineCommentThreads(resolvedFiltered, sort, mergedThreadPositions);
  const filteredAndSortedThreads = sortedThreads.map((thread) => ({
    thread,
    referenceText: getInlineCommentThreadReferenceText(
      editor,
      thread,
      localThreadReferenceTexts.get(thread.id),
      mergedThreadPositions.get(thread.id)
    ),
  }));
  const threadDataById = new Map(filteredAndSortedThreads.map(({ thread }) => [thread.id, thread]));
  const sidebarThreads = filteredAndSortedThreads.map(({ thread, referenceText }) =>
    mapThreadToSidebarThread(
      thread,
      referenceText,
      visibilityScope.currentUserId,
      resolveInlineCommentUser
    )
  );

  const handleSelectThread = useMemoizedFn((threadId: string) => {
    commentsExtension.selectThread(threadId);
  });

  const handleDeleteInlineComment = useMemoizedFn(
    async (threadId: string, inlineCommentId: string) => {
      try {
        await commentsExtension.threadStore.deleteComment({
          threadId,
          commentId: inlineCommentId,
        });
      } catch (error) {
        toast.danger(error instanceof Error ? error.message : '删除批注失败');
      }
    }
  );

  const handleUpdateInlineComment = useMemoizedFn(
    async (threadId: string, inlineCommentId: string, content: string) => {
      try {
        await commentsExtension.threadStore.updateComment({
          threadId,
          commentId: inlineCommentId,
          comment: {
            body: buildTextInlineCommentBody(content),
          },
        });
      } catch (error) {
        toast.danger('批注修改失败');
        throw error;
      }
    }
  );

  const handleChangeInlineCommentReaction = useMemoizedFn(
    async (threadId: string, inlineCommentId: string, emojiId: string, nextReacted: boolean) => {
      try {
        const params = {
          threadId,
          commentId: inlineCommentId,
          emoji: emojiId,
        };
        if (nextReacted) {
          await commentsExtension.threadStore.addReaction(params);
        } else {
          await commentsExtension.threadStore.deleteReaction(params);
        }
      } catch (error) {
        const fallback = nextReacted ? '表情回复失败' : '取消表情回复失败';
        toast.danger(error instanceof Error ? error.message : fallback);
      }
    }
  );

  const handleResolveThread = useMemoizedFn(async (threadId: string) => {
    try {
      await commentsExtension.threadStore.resolveThread({ threadId });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '解决批注失败');
    }
  });

  const handleReopenThread = useMemoizedFn(async (threadId: string) => {
    try {
      await commentsExtension.threadStore.unresolveThread({ threadId });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '重新打开批注失败');
    }
  });

  const handleReplyThread = useMemoizedFn(async (threadId: string, content: string) => {
    try {
      await commentsExtension.threadStore.addComment({
        threadId,
        comment: {
          body: buildTextInlineCommentBody(content),
        },
      });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '回复批注失败');
    }
  });

  return (
    <WisePenInlineCommentSidebar
      threads={sidebarThreads}
      selectedThreadId={selectedThreadId}
      maxInlineCommentsBeforeCollapse={maxInlineCommentsBeforeCollapse}
      actionMode={actionMode}
      actionsEnabled={actionsEnabled}
      canReopenThread={(thread) => {
        const sourceThread = threadDataById.get(thread.id);
        return sourceThread ? (canReopenThread?.(sourceThread) ?? false) : false;
      }}
      onSelectThread={handleSelectThread}
      onUpdateInlineComment={handleUpdateInlineComment}
      onDeleteInlineComment={handleDeleteInlineComment}
      onChangeInlineCommentReaction={handleChangeInlineCommentReaction}
      onResolveThread={handleResolveThread}
      onReopenThread={handleReopenThread}
      onReplyThread={handleReplyThread}
    />
  );
}
