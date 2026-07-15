import type {
  NoteInlineCommentAnchor,
  NoteInlineCommentEditor,
  NoteInlineCommentFacet,
} from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { resolveFormulaInlineCommentPosition } from './formulaInlineCommentAnchor';
import { applyFormulaInlineCommentMark } from './formulaInlineCommentMark';
import {
  getFormulaInlineCommentAnchorReferenceText,
  getFormulaInlineCommentReferenceText,
} from './formulaInlineCommentReference';
import { selectFormulaInlineCommentAnchor } from './formulaInlineCommentSelection';
import {
  getFormulaInlineCommentAnchorsYMap,
  isSameFormulaInlineCommentAnchor,
  parseFormulaInlineCommentAnchor,
  type FormulaInlineCommentAnchor,
} from './inlineCommentAnchor';

function createFormulaAnchorFacet(kind: FormulaInlineCommentAnchor['kind']) {
  const parse = (value: unknown): NoteInlineCommentAnchor | null => {
    const anchor = parseFormulaInlineCommentAnchor(value);
    return anchor?.kind === kind ? (anchor as unknown as NoteInlineCommentAnchor) : null;
  };

  return {
    getStore: getFormulaInlineCommentAnchorsYMap,
    parse,
    select: (editor: NoteInlineCommentEditor, value: NoteInlineCommentAnchor) => {
      const anchor = parseFormulaInlineCommentAnchor(value);
      return anchor
        ? selectFormulaInlineCommentAnchor(editor as CustomBlockNoteEditor, anchor)
        : false;
    },
    resolve: (editor: NoteInlineCommentEditor, value: NoteInlineCommentAnchor) => {
      const anchor = parseFormulaInlineCommentAnchor(value);
      return anchor
        ? resolveFormulaInlineCommentPosition(editor as CustomBlockNoteEditor, anchor)
        : null;
    },
    getReferenceText: (editor: NoteInlineCommentEditor, value: NoteInlineCommentAnchor) => {
      const anchor = parseFormulaInlineCommentAnchor(value);
      return anchor
        ? getFormulaInlineCommentAnchorReferenceText(editor as CustomBlockNoteEditor, anchor)
        : undefined;
    },
    getSelectionReferenceText: (editor: NoteInlineCommentEditor) =>
      getFormulaInlineCommentReferenceText(editor as CustomBlockNoteEditor),
    equals: (left: NoteInlineCommentAnchor, right: NoteInlineCommentAnchor) => {
      const leftAnchor = parseFormulaInlineCommentAnchor(left);
      const rightAnchor = parseFormulaInlineCommentAnchor(right);
      return Boolean(
        leftAnchor &&
        rightAnchor &&
        leftAnchor.kind === kind &&
        rightAnchor.kind === kind &&
        isSameFormulaInlineCommentAnchor(leftAnchor, rightAnchor)
      );
    },
    syncMark:
      kind === 'inline'
        ? (
            editor: NoteInlineCommentEditor,
            threadId: string,
            _value: NoteInlineCommentAnchor,
            position: { from: number; to: number }
          ) => applyFormulaInlineCommentMark(editor as CustomBlockNoteEditor, threadId, position)
        : undefined,
  };
}

export const mathBlockInlineCommentFacet = {
  mode: 'dedicated',
  hideFormattingToolbar: true,
  anchor: createFormulaAnchorFacet('block'),
} satisfies NoteInlineCommentFacet;

export const inlineMathInlineCommentFacet = {
  mode: 'dedicated',
  hideFormattingToolbar: true,
  anchor: createFormulaAnchorFacet('inline'),
} satisfies NoteInlineCommentFacet;
