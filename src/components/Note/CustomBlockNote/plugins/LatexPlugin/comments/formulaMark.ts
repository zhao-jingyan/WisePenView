import { CommentMark } from '@blocknote/core/comments';
import type { Mark as PmMark, MarkType as PmMarkType, Node as PmNode } from '@tiptap/pm/model';

import { WISEPEN_COMMENT_MARK_SYNC_META } from '../../../engines/comments/anchors/range';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import type { FormulaThreadPosition } from './formulaAnchor';

function formulaMarkExists(
  doc: PmNode,
  markType: PmMarkType,
  threadId: string,
  from: number,
  to: number
): boolean {
  let found = false;
  doc.nodesBetween(from, to, (node: PmNode) => {
    if (
      node.marks.some(
        (mark: PmMark) =>
          mark.type === markType && mark.attrs.threadId === threadId && mark.attrs.orphan !== true
      )
    ) {
      found = true;
    }
  });
  return found;
}

export function applyFormulaThreadMark(
  editor: CustomBlockNoteEditor,
  threadId: string,
  position: FormulaThreadPosition
): boolean {
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType || position.from >= position.to) {
    return false;
  }
  const doc = editor.prosemirrorView.state.doc;
  if (formulaMarkExists(doc, markType, threadId, position.from, position.to)) {
    return true;
  }
  editor.transact((tr) => {
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
    tr.removeMark(position.from, position.to, markType);
    tr.addMark(position.from, position.to, markType.create({ threadId, orphan: false }));
  });
  return formulaMarkExists(
    editor.prosemirrorView.state.doc,
    markType,
    threadId,
    position.from,
    position.to
  );
}
