import { NodeSelection, TextSelection } from '@tiptap/pm/state';

import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import type { FormulaThreadAnchor } from './anchor';
import { resolveFormulaThreadPosition } from './formulaAnchor';

function selectMathBlock(editor: CustomBlockNoteEditor, blockId: string): boolean {
  const position = resolveFormulaThreadPosition(editor, { kind: 'block', blockId });
  if (position && position.from < position.to) {
    try {
      editor.transact((tr) => tr.setSelection(NodeSelection.create(tr.doc, position.from)));
      return true;
    } catch {
      // 自定义数学块不支持节点选区时，继续尝试文本范围。
    }
    try {
      editor.transact((tr) =>
        tr.setSelection(TextSelection.create(tr.doc, position.from, position.to))
      );
      return true;
    } catch {
      // 末级回退由 BlockNote 处理块选区。
    }
  }
  try {
    editor.setSelection(blockId, blockId);
    return true;
  } catch {
    return false;
  }
}

export function selectFormulaThreadAnchor(
  editor: CustomBlockNoteEditor,
  anchor: FormulaThreadAnchor
): boolean {
  if (anchor.kind === 'block') {
    return selectMathBlock(editor, anchor.blockId);
  }
  const position = resolveFormulaThreadPosition(editor, anchor);
  if (!position) {
    return false;
  }
  try {
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, position.from, position.to))
    );
    return true;
  } catch {
    return false;
  }
}
