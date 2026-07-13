import type {
  NoteCommentAnchor,
  NoteCommentEditor,
  NoteCommentFacet,
} from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  getFormulaThreadAnchorsYMap,
  isSameFormulaThreadAnchor,
  parseFormulaThreadAnchor,
  type FormulaThreadAnchor,
} from './anchor';
import { resolveFormulaThreadPosition } from './formulaAnchor';
import { applyFormulaThreadMark } from './formulaMark';
import { getFormulaAnchorReferenceText, getFormulaCommentReferenceText } from './formulaReference';
import { selectFormulaThreadAnchor } from './formulaSelection';

function createFormulaAnchorFacet(kind: FormulaThreadAnchor['kind']) {
  const parse = (value: unknown): NoteCommentAnchor | null => {
    const anchor = parseFormulaThreadAnchor(value);
    return anchor?.kind === kind ? (anchor as unknown as NoteCommentAnchor) : null;
  };

  return {
    getStore: getFormulaThreadAnchorsYMap,
    parse,
    select: (editor: NoteCommentEditor, value: NoteCommentAnchor) => {
      const anchor = parseFormulaThreadAnchor(value);
      return anchor ? selectFormulaThreadAnchor(editor as CustomBlockNoteEditor, anchor) : false;
    },
    resolve: (editor: NoteCommentEditor, value: NoteCommentAnchor) => {
      const anchor = parseFormulaThreadAnchor(value);
      return anchor ? resolveFormulaThreadPosition(editor as CustomBlockNoteEditor, anchor) : null;
    },
    getReferenceText: (editor: NoteCommentEditor, value: NoteCommentAnchor) => {
      const anchor = parseFormulaThreadAnchor(value);
      return anchor
        ? getFormulaAnchorReferenceText(editor as CustomBlockNoteEditor, anchor)
        : undefined;
    },
    getSelectionReferenceText: (editor: NoteCommentEditor) =>
      getFormulaCommentReferenceText(editor as CustomBlockNoteEditor),
    equals: (left: NoteCommentAnchor, right: NoteCommentAnchor) => {
      const leftAnchor = parseFormulaThreadAnchor(left);
      const rightAnchor = parseFormulaThreadAnchor(right);
      return Boolean(
        leftAnchor &&
        rightAnchor &&
        leftAnchor.kind === kind &&
        rightAnchor.kind === kind &&
        isSameFormulaThreadAnchor(leftAnchor, rightAnchor)
      );
    },
    syncMark:
      kind === 'inline'
        ? (
            editor: NoteCommentEditor,
            threadId: string,
            _value: NoteCommentAnchor,
            position: { from: number; to: number }
          ) => applyFormulaThreadMark(editor as CustomBlockNoteEditor, threadId, position)
        : undefined,
  };
}

export const mathBlockCommentFacet = {
  mode: 'dedicated',
  hideFormattingToolbar: true,
  anchor: createFormulaAnchorFacet('block'),
} satisfies NoteCommentFacet;

export const inlineMathCommentFacet = {
  mode: 'dedicated',
  hideFormattingToolbar: true,
  anchor: createFormulaAnchorFacet('inline'),
} satisfies NoteCommentFacet;
