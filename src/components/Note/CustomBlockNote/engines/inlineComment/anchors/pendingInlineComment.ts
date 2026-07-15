import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

export type PendingInlineCommentSelection = {
  anchor: number;
  head: number;
};

export type PendingInlineCommentReference = {
  referenceText: string;
  existingThreadIds: Set<string>;
};

export function capturePendingInlineCommentSelection(
  editor: CustomBlockNoteEditor
): PendingInlineCommentSelection | undefined {
  const { anchor, head } = editor.prosemirrorView.state.selection;
  if (anchor === head) {
    return undefined;
  }
  return { anchor, head };
}

export function applyPendingInlineCommentReference(
  pendingReference: PendingInlineCommentReference | null,
  threadsYMap: Y.Map<unknown>,
  threadReferencesYMap: Y.Map<string>
): PendingInlineCommentReference | null {
  if (!pendingReference) {
    return null;
  }

  let remaining: PendingInlineCommentReference | null = pendingReference;

  threadsYMap.forEach((_rawThread, threadId) => {
    if (!remaining) {
      return;
    }
    const id = String(threadId);
    if (remaining.existingThreadIds.has(id)) {
      return;
    }
    threadReferencesYMap.set(id, remaining.referenceText);
    remaining = null;
  });

  return remaining;
}
