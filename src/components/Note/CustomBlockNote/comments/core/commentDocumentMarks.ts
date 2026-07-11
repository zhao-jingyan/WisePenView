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

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import { getRootDomSelection } from '../../plugins/editorProseMirrorRoot';
import {
  getBlockNoteThreadsYMap,
  isThreadActive,
  type FormulaThreadAnchor,
} from './commentThreadConstants';
import { getHiddenThreadIdsForUser, type ThreadVisibilityContext } from './threadVisibility';

export const WISEPEN_COMMENT_MARK_SYNC_META = 'wisePenCommentMarkSync';
export const WISEPEN_FORMULA_YJS_ORIGIN = 'wisePenFormulaCommentSync';
export const BLOCKNOTE_YJS_THREAD_DOCUMENT_SELECTIONS_MAP = 'thread-document-selections' as const;

export let isFormulaCommentSyncing = false;

export type EncodedThreadDocumentSelection = {
  anchor: Uint8Array;
  head: Uint8Array;
};

type ProsemirrorMapping = Map<Y.AbstractType<unknown>, ProseMirrorNode | ProseMirrorNode[]>;

type YjsBinding = {
  type: Y.XmlFragment;
  mapping: ProsemirrorMapping;
};

export function isWisePenCommentMarkSyncTransaction(tr: {
  getMeta: (key: string) => unknown;
}): boolean {
  return tr.getMeta(WISEPEN_COMMENT_MARK_SYNC_META) === true;
}

export function isWisePenFormulaYjsTransaction(origin: unknown): boolean {
  return origin === WISEPEN_FORMULA_YJS_ORIGIN;
}

export function runWithFormulaCommentSync<T>(fn: () => T): T {
  isFormulaCommentSyncing = true;
  try {
    return fn();
  } finally {
    isFormulaCommentSyncing = false;
  }
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
  }, WISEPEN_FORMULA_YJS_ORIGIN);
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

export function orphanCommentMarksForThreadIds(
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
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
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

export function applyCommentMarkToRange(
  editor: CustomBlockNoteEditor,
  threadId: string,
  from: number,
  to: number
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType || from >= to) {
    return false;
  }

  if (commentMarkCoversThread(editor, threadId, from, to)) {
    return true;
  }

  const rangeText = editor.prosemirrorView.state.doc.textBetween(from, to, '');
  if (!rangeText) {
    return false;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
    const selectedNode = tr.doc.nodeAt(from);
    if (selectedNode?.type.name === 'math' && to <= from + selectedNode.nodeSize) {
      return;
    }
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

export function hasCommentDocumentYjsBinding(editor: CustomBlockNoteEditor): boolean {
  return getYjsBinding(editor) !== null;
}

export function pruneThreadDocumentSelections(
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
    doc.transact(remove, WISEPEN_FORMULA_YJS_ORIGIN);
  } else {
    remove();
  }
}

export function syncPlainTextCommentDocumentMarks(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  formulaAnchorsYMap: Y.Map<FormulaThreadAnchor>,
  visibilityContext?: ThreadVisibilityContext
): void {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);

  pruneThreadDocumentSelections(selectionsYMap, threadsYMap);

  const hiddenThreadIds = visibilityContext
    ? getHiddenThreadIdsForUser(Array.from(threadsYMap.values()) as ThreadData[], visibilityContext)
    : new Set<string>();

  if (hiddenThreadIds.size > 0) {
    orphanCommentMarksForThreadIds(editor, hiddenThreadIds);
  }

  selectionsYMap.forEach((stored, threadId) => {
    const id = String(threadId);
    if (formulaAnchorsYMap.has(id)) {
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

    applyCommentMarkToRange(editor, id, range.from, range.to);
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
