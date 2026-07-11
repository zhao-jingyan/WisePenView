import type { CommentData, ThreadData } from '@blocknote/core/comments';
import { CommentsExtension } from '@blocknote/core/comments';
import { useExtension, useExtensionState } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';
import type { Doc } from 'yjs';

import {
  WisePenCommentsSidebar,
  type WisePenCommentAuthorInfo,
  type WisePenSidebarThread,
} from '@/components/CommentsSidebar';
import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import { getBlockNoteThreadsYMap } from '../../core/commentThreadConstants';
import {
  buildTextCommentBody,
  buildThreadSnapshot,
  extractPlainTextFromCommentBody,
} from '../../core/inlineCommentThreadStore';
import {
  filterThreadsByResolvedState,
  getThreadReferenceText,
  sortCommentThreads,
  type ThreadPosition,
  type ThreadResolvedFilter,
} from '../../core/threadReferenceText';
import {
  filterThreadsByVisibility,
  type ThreadVisibilityContext,
} from '../../core/threadVisibility';

type CustomThreadsSidebarProps = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  formulaThreadPositions?: Map<string, ThreadPosition>;
  visibilityContext: ThreadVisibilityContext;
  filter?: ThreadResolvedFilter;
  sort?: 'position' | 'recent-activity' | 'oldest';
  maxCommentsBeforeCollapse?: number;
  actionMode?: 'default' | 'history';
  canReopenThread?: (thread: ThreadData) => boolean;
  actionsEnabled?: boolean;
  resolveCommentAuthor: (comment: CommentData) => WisePenCommentAuthorInfo;
};

function isDeletedComment(comment: CommentData): boolean {
  return Boolean(comment.deletedAt);
}

function mapThreadToSidebarThread(
  thread: ThreadData,
  referenceText: string,
  currentUserId: string,
  resolveCommentAuthor: CustomThreadsSidebarProps['resolveCommentAuthor']
): WisePenSidebarThread {
  return {
    id: thread.id,
    referenceText,
    resolved: thread.resolved,
    comments: thread.comments.map((comment) => ({
      id: comment.id,
      author: resolveCommentAuthor(comment),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      content: extractPlainTextFromCommentBody(comment.body),
      deleted: isDeletedComment(comment),
      canUpdate: comment.userId === currentUserId,
    })),
  };
}

export function CustomThreadsSidebar({
  editor,
  doc,
  localThreadReferenceTexts,
  formulaThreadPositions = new Map(),
  visibilityContext,
  filter = 'open',
  sort = 'position',
  maxCommentsBeforeCollapse,
  actionMode = 'default',
  canReopenThread,
  actionsEnabled = false,
  resolveCommentAuthor,
}: CustomThreadsSidebarProps) {
  const comments = useExtension(CommentsExtension);
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
  formulaThreadPositions.forEach((position, threadId) => {
    if (!mergedThreadPositions.has(threadId)) {
      mergedThreadPositions.set(threadId, position);
    }
  });

  const visibleThreads = filterThreadsByVisibility(threads.values(), visibilityContext);
  const resolvedFiltered = filterThreadsByResolvedState(visibleThreads, filter);
  const sortedThreads = sortCommentThreads(resolvedFiltered, sort, mergedThreadPositions);
  const filteredAndSortedThreads = sortedThreads.map((thread) => ({
    thread,
    referenceText: getThreadReferenceText(
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
      visibilityContext.currentUserId,
      resolveCommentAuthor
    )
  );

  const handleSelectThread = useMemoizedFn((threadId: string) => {
    comments.selectThread(threadId);
  });

  const handleDeleteComment = useMemoizedFn(async (threadId: string, commentId: string) => {
    try {
      await comments.threadStore.deleteComment({ threadId, commentId });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '删除批注失败');
    }
  });

  const handleUpdateComment = useMemoizedFn(
    async (threadId: string, commentId: string, content: string) => {
      try {
        await comments.threadStore.updateComment({
          threadId,
          commentId,
          comment: {
            body: buildTextCommentBody(content),
          },
        });
      } catch (error) {
        toast.danger('批注修改失败');
        throw error;
      }
    }
  );

  const handleResolveThread = useMemoizedFn(async (threadId: string) => {
    try {
      await comments.threadStore.resolveThread({ threadId });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '解决批注失败');
    }
  });

  const handleReopenThread = useMemoizedFn(async (threadId: string) => {
    try {
      await comments.threadStore.unresolveThread({ threadId });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '重新打开批注失败');
    }
  });

  const handleReplyThread = useMemoizedFn(async (threadId: string, content: string) => {
    try {
      await comments.threadStore.addComment({
        threadId,
        comment: {
          body: buildTextCommentBody(content),
        },
      });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : '回复批注失败');
    }
  });

  return (
    <WisePenCommentsSidebar
      threads={sidebarThreads}
      selectedThreadId={selectedThreadId}
      maxCommentsBeforeCollapse={maxCommentsBeforeCollapse}
      actionMode={actionMode}
      actionsEnabled={actionsEnabled}
      canReopenThread={(thread) => {
        const sourceThread = threadDataById.get(thread.id);
        return sourceThread ? (canReopenThread?.(sourceThread) ?? false) : false;
      }}
      onSelectThread={handleSelectThread}
      onUpdateComment={handleUpdateComment}
      onDeleteComment={handleDeleteComment}
      onResolveThread={handleResolveThread}
      onReopenThread={handleReopenThread}
      onReplyThread={handleReplyThread}
    />
  );
}
