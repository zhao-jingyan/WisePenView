import type { ThreadData } from '@blocknote/core/comments';

import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

export type ThreadPosition = { from: number; to: number };

type InlineCommentThreadMetadata = { quoteText?: string; referenceText?: string };
type InlineCommentTimeValue = Date | number | string | null | undefined;

export function getThreadInlineComments(thread: ThreadData): ThreadData['comments'] {
  return Array.isArray(thread.comments) ? thread.comments : [];
}

function getStoredThreadReferenceText(thread: ThreadData): string | undefined {
  const metadata = thread.metadata as InlineCommentThreadMetadata | undefined;
  const referenceText = metadata?.referenceText ?? metadata?.quoteText;
  return referenceText?.trim() || undefined;
}

export function getInlineCommentThreadReferenceText(
  editor: CustomBlockNoteEditor,
  thread: ThreadData,
  localReferenceText: string | undefined,
  threadPosition?: ThreadPosition
): string {
  const fallback = localReferenceText ?? getStoredThreadReferenceText(thread);

  if (!threadPosition) {
    return fallback ?? '';
  }

  return editor.transact((tr) => {
    if (tr.doc.nodeSize < threadPosition.to) {
      return fallback ?? '';
    }

    const referenceText = tr.doc.textBetween(threadPosition.from, threadPosition.to);
    if (!referenceText) {
      return fallback ?? '';
    }
    if (referenceText.length > 15) {
      return `${referenceText.slice(0, 15)}…`;
    }
    return referenceText;
  });
}

export function sortInlineCommentThreads(
  threads: ThreadData[],
  sort: 'position' | 'recent-activity' | 'oldest',
  threadPositions?: Map<string, ThreadPosition>
): ThreadData[] {
  if (sort === 'recent-activity') {
    return [...threads].sort(
      (a, b) => getLastInlineCommentTimeValue(b) - getLastInlineCommentTimeValue(a)
    );
  }

  if (sort === 'oldest') {
    return [...threads].sort(
      (a, b) => getInlineCommentTimeValue(a.createdAt) - getInlineCommentTimeValue(b.createdAt)
    );
  }

  return [...threads].sort((a, b) => {
    const threadA = threadPositions?.get(a.id)?.from ?? Number.MAX_VALUE;
    const threadB = threadPositions?.get(b.id)?.from ?? Number.MAX_VALUE;
    return threadA - threadB;
  });
}

function getLastInlineCommentTimeValue(thread: ThreadData): number {
  const comments = getThreadInlineComments(thread);
  return getInlineCommentTimeValue(comments[comments.length - 1]?.createdAt);
}

function getInlineCommentTimeValue(value: InlineCommentTimeValue): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

export type InlineCommentResolvedFilter = 'open' | 'resolved' | 'all';

export function filterInlineCommentThreadsByResolvedState(
  threads: ThreadData[],
  filter: InlineCommentResolvedFilter
): ThreadData[] {
  return threads.filter((thread) => {
    if (!thread.resolved) {
      return filter === 'open' || filter === 'all';
    }
    return filter === 'resolved' || filter === 'all';
  });
}
