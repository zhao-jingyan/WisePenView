import type { ThreadData } from '@blocknote/core/comments';
import { CommentMark } from '@blocknote/core/comments';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from 'y-prosemirror';
import * as Y from 'yjs';

import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { getRootDomSelection } from '../../editor/dom';
import { getBlockNoteThreadsYMap, isThreadActive } from '../threads/yjs';
import {
  getHiddenInlineCommentThreadIdsForUser,
  type InlineCommentVisibilityScope,
} from '../visibility/filter';
import { isDocumentThreadRangeAllowed } from './selection';

export const WISEPEN_INLINE_COMMENT_MARK_SYNC_META = 'wisePenCommentMarkSync';
const RANGE_INLINE_COMMENT_YJS_ORIGIN = 'wisePenRangeCommentSync';
const BLOCKNOTE_YJS_THREAD_DOCUMENT_SELECTIONS_MAP = 'thread-document-selections' as const;

type EncodedThreadDocumentSelection = {
  anchor: Uint8Array;
  head: Uint8Array;
};

type ProsemirrorMapping = Map<Y.AbstractType<unknown>, ProseMirrorNode | ProseMirrorNode[]>;

type YjsBinding = {
  type: Y.XmlFragment;
  mapping: ProsemirrorMapping;
};

export function isWisePenInlineCommentMarkSyncTransaction(tr: {
  getMeta: (key: string) => unknown;
}): boolean {
  return tr.getMeta(WISEPEN_INLINE_COMMENT_MARK_SYNC_META) === true;
}

export function getBlockNoteThreadDocumentSelectionsYMap(doc: Y.Doc) {
  return doc.getMap<EncodedThreadDocumentSelection>(BLOCKNOTE_YJS_THREAD_DOCUMENT_SELECTIONS_MAP);
}

function getYjsBinding(editor: CustomBlockNoteEditor): YjsBinding | null {
  const syncState = ySyncPluginKey.getState(editor.prosemirrorView.state) as
    { binding?: YjsBinding } | undefined;
  const binding = syncState?.binding;
  if (!binding?.type || !binding.mapping) {
    return null;
  }
  return binding;
}

export function persistThreadDocumentSelection(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  threadId: string,
  from: number,
  to: number
): void {
  const binding = getYjsBinding(editor);
  if (!binding || from >= to) {
    return;
  }

  const relAnchor = absolutePositionToRelativePosition(from, binding.type, binding.mapping);
  const relHead = absolutePositionToRelativePosition(to, binding.type, binding.mapping);
  const payload: EncodedThreadDocumentSelection = {
    anchor: Y.encodeRelativePosition(relAnchor),
    head: Y.encodeRelativePosition(relHead),
  };

  const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
  const docRef = selectionsYMap.doc ?? doc;
  docRef.transact(() => {
    selectionsYMap.set(threadId, payload);
  }, RANGE_INLINE_COMMENT_YJS_ORIGIN);
}

function resolveStoredThreadDocumentRange(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  stored: EncodedThreadDocumentSelection
): { from: number; to: number } | null {
  const binding = getYjsBinding(editor);
  if (!binding) {
    return null;
  }

  try {
    const anchorPos = relativePositionToAbsolutePosition(
      doc,
      binding.type,
      Y.decodeRelativePosition(stored.anchor),
      binding.mapping
    );
    const headPos = relativePositionToAbsolutePosition(
      doc,
      binding.type,
      Y.decodeRelativePosition(stored.head),
      binding.mapping
    );
    if (anchorPos == null || headPos == null) {
      return null;
    }
    const from = Math.max(0, Math.min(anchorPos, headPos));
    const to = Math.min(
      editor.prosemirrorView.state.doc.content.size,
      Math.max(anchorPos, headPos)
    );
    if (from >= to) {
      return null;
    }
    return { from, to };
  } catch {
    return null;
  }
}

/**
 * 判断 [from, to] 内所有文本是否都挂有该 thread 的可见 CommentMark。
 * 不能只查“是否存在任意一处 mark”：跨块批注在行尾/块边界插入时，
 * 原区间其它位置仍有 mark，会导致漏补新插入文字的高亮。
 */
function commentMarkCoversThread(
  editor: CustomBlockNoteEditor,
  threadId: string,
  from: number,
  to: number
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return false;
  }

  let hasText = false;
  let fullyCovered = true;
  editor.prosemirrorView.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!fullyCovered || !node.isText || !node.text) {
      return fullyCovered;
    }
    const overlapFrom = Math.max(from, pos);
    const overlapTo = Math.min(to, pos + node.nodeSize);
    if (overlapFrom >= overlapTo) {
      return;
    }
    hasText = true;
    const covered = node.marks.some(
      (mark) =>
        mark.type === markType && mark.attrs.threadId === threadId && mark.attrs.orphan !== true
    );
    if (!covered) {
      fullyCovered = false;
      return false;
    }
  });
  return hasText && fullyCovered;
}

function orphanInlineCommentMarksForThreadIds(
  editor: CustomBlockNoteEditor,
  threadIds: ReadonlySet<string>
): void {
  if (threadIds.size === 0) {
    return;
  }

  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_INLINE_COMMENT_MARK_SYNC_META, true);
    editor.prosemirrorView.state.doc.descendants((node, pos) => {
      if (!node.isText) {
        return;
      }
      node.marks.forEach((mark) => {
        if (
          mark.type !== markType ||
          mark.attrs.orphan === true ||
          !threadIds.has(String(mark.attrs.threadId))
        ) {
          return;
        }
        const from = pos;
        const to = pos + node.nodeSize;
        tr.removeMark(from, to, mark);
        tr.addMark(from, to, markType.create({ threadId: mark.attrs.threadId, orphan: true }));
      });
    });
  });
}

function applyInlineCommentMarkToRange(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  threadId: string,
  from: number,
  to: number
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType || from >= to) {
    return false;
  }

  const rangeText = editor.prosemirrorView.state.doc.textBetween(from, to, '');
  if (!rangeText || !isDocumentThreadRangeAllowed(editor, registry, from, to)) {
    return false;
  }

  if (commentMarkCoversThread(editor, threadId, from, to)) {
    return true;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_INLINE_COMMENT_MARK_SYNC_META, true);
    // 先清掉同 thread 的 orphan mark，再挂回可见高亮
    tr.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) {
        return;
      }
      node.marks.forEach((mark) => {
        if (mark.type === markType && mark.attrs.threadId === threadId) {
          tr.removeMark(pos, pos + node.nodeSize, mark);
        }
      });
    });
    tr.addMark(from, to, markType.create({ threadId, orphan: false }));
  });

  return commentMarkCoversThread(editor, threadId, from, to);
}

export function hasInlineCommentDocumentYjsBinding(editor: CustomBlockNoteEditor): boolean {
  return getYjsBinding(editor) !== null;
}

function pruneThreadDocumentSelections(
  selectionsYMap: Y.Map<EncodedThreadDocumentSelection>,
  threadsYMap: Y.Map<unknown>
) {
  const staleIds: string[] = [];
  selectionsYMap.forEach((_value, threadId) => {
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      staleIds.push(String(threadId));
    }
  });
  if (staleIds.length === 0) {
    return;
  }
  const doc = selectionsYMap.doc;
  const remove = () => {
    staleIds.forEach((threadId) => {
      selectionsYMap.delete(threadId);
    });
  };
  if (doc) {
    doc.transact(remove, RANGE_INLINE_COMMENT_YJS_ORIGIN);
  } else {
    remove();
  }
}

export function syncPlainTextInlineCommentDocumentMarks(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  doc: Y.Doc,
  contentThreadIds: ReadonlySet<string>,
  visibilityScope?: InlineCommentVisibilityScope
): void {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);

  pruneThreadDocumentSelections(selectionsYMap, threadsYMap);

  const hiddenThreadIds = visibilityScope
    ? getHiddenInlineCommentThreadIdsForUser(
        Array.from(threadsYMap.values()) as ThreadData[],
        visibilityScope
      )
    : new Set<string>();

  if (hiddenThreadIds.size > 0) {
    orphanInlineCommentMarksForThreadIds(editor, hiddenThreadIds);
  }

  selectionsYMap.forEach((stored, threadId) => {
    const id = String(threadId);
    if (contentThreadIds.has(id)) {
      return;
    }
    if (hiddenThreadIds.has(id)) {
      return;
    }
    const thread = threadsYMap.get(threadId) as ThreadData | undefined;
    if (!isThreadActive(thread)) {
      return;
    }

    const range = resolveStoredThreadDocumentRange(editor, doc, stored);
    if (!range) {
      return;
    }

    applyInlineCommentMarkToRange(editor, registry, id, range.from, range.to);
  });
}

export function syncDomSelectionToProseMirror(editor: CustomBlockNoteEditor): void {
  const domSelection = getRootDomSelection(editor.prosemirrorView.root);
  if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
    return;
  }
  const editorDom = editor.prosemirrorView.dom;
  const anchorNode = domSelection.anchorNode;
  const focusNode = domSelection.focusNode;
  if (!anchorNode || !focusNode) {
    return;
  }
  const anchorElement =
    anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
  const focusElement =
    focusNode.nodeType === Node.ELEMENT_NODE ? focusNode : focusNode.parentElement;
  if (!anchorElement || !focusElement) {
    return;
  }
  if (!editorDom.contains(anchorElement) || !editorDom.contains(focusElement)) {
    return;
  }
  try {
    const anchor = editor.prosemirrorView.posAtDOM(anchorNode, domSelection.anchorOffset);
    const head = editor.prosemirrorView.posAtDOM(focusNode, domSelection.focusOffset);
    if (anchor === head) {
      return;
    }
    editor.prosemirrorView.dispatch(
      editor.prosemirrorView.state.tr.setSelection(
        TextSelection.create(editor.prosemirrorView.state.doc, anchor, head)
      )
    );
  } catch {
    void 0;
  }
}
