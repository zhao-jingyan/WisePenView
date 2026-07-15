import type { Node as PmNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { resolveFormulaInlineCommentPosition } from './formulaInlineCommentAnchor';
import { INLINE_MATH_PM_TYPE, type FormulaInlineCommentAnchor } from './inlineCommentAnchor';

export type FormulaInlineCommentKind = 'block' | 'inline';

function formatInlineMathSelectionText(expression: string): string {
  return `$${expression.trim()}$`;
}

function formatBlockMathSelectionText(expression: string): string {
  return `$$${expression.trim()}$$`;
}

export function formatFormulaInlineCommentReferenceText(
  expression: string,
  kind: FormulaInlineCommentKind
): string | undefined {
  const trimmed = expression.trim();
  if (!trimmed) {
    return undefined;
  }
  return kind === 'block'
    ? formatBlockMathSelectionText(trimmed)
    : formatInlineMathSelectionText(trimmed);
}

function getInlineMathReferenceFromSelection(view: EditorView): string | undefined {
  const { from, to } = view.state.selection;
  if (from >= to) {
    return undefined;
  }

  let referenceText: string | undefined;
  view.state.doc.nodesBetween(from, to, (node) => {
    if (referenceText || node.type.name !== INLINE_MATH_PM_TYPE) {
      return;
    }
    const expression = node.attrs?.expression;
    if (typeof expression === 'string') {
      referenceText = formatFormulaInlineCommentReferenceText(expression, 'inline');
    }
  });
  return referenceText;
}

function getFormulaAwareReferenceTextFromRange(
  doc: PmNode,
  from: number,
  to: number
): string | undefined {
  const parts: string[] = [];
  const inlineMathExpressions: string[] = [];
  const blockMathExpressions: string[] = [];
  let hasVisibleText = false;

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const textStart = Math.max(0, from - pos);
      const textEnd = Math.min(node.text?.length ?? 0, to - pos);
      const text = node.text?.slice(textStart, textEnd) ?? '';
      if (text.trim()) {
        hasVisibleText = true;
      }
      parts.push(text);
      return;
    }

    if (node.type.name === INLINE_MATH_PM_TYPE) {
      const expression = node.attrs?.expression;
      if (typeof expression === 'string' && expression.trim()) {
        const trimmed = expression.trim();
        inlineMathExpressions.push(trimmed);
        parts.push(formatInlineMathSelectionText(trimmed));
      }
      return false;
    }

    if (node.type.name === 'math') {
      const expression = node.attrs?.expression;
      if (typeof expression === 'string' && expression.trim()) {
        const trimmed = expression.trim();
        blockMathExpressions.push(trimmed);
        parts.push(formatBlockMathSelectionText(trimmed));
      }
      return false;
    }

    return undefined;
  });

  const referenceText = parts.join('').replace(/\s+/g, ' ').trim();
  if (!hasVisibleText && inlineMathExpressions.length + blockMathExpressions.length === 1) {
    return referenceText || undefined;
  }
  return referenceText || undefined;
}

function getFormulaAwareReferenceTextFromSelection(view: EditorView): string | undefined {
  const { from, to } = view.state.selection;
  if (from >= to) {
    return undefined;
  }
  return getFormulaAwareReferenceTextFromRange(view.state.doc, from, to);
}

export function getFormulaInlineCommentAnchorReferenceText(
  editor: CustomBlockNoteEditor,
  anchor: FormulaInlineCommentAnchor
): string | undefined {
  if (anchor.kind === 'block') {
    const block = editor.getBlock(anchor.blockId);
    const expression = block?.type === 'math' ? block.props.expression : undefined;
    return typeof expression === 'string'
      ? formatFormulaInlineCommentReferenceText(expression, 'block')
      : undefined;
  }

  const position = resolveFormulaInlineCommentPosition(editor, anchor);
  if (!position) {
    return undefined;
  }
  let expression: string | undefined;
  editor.prosemirrorView.state.doc.nodesBetween(position.from, position.to, (node) => {
    if (!expression && node.type.name === INLINE_MATH_PM_TYPE) {
      const value = node.attrs?.expression;
      if (typeof value === 'string') {
        expression = value;
      }
    }
  });
  return expression ? formatFormulaInlineCommentReferenceText(expression, 'inline') : undefined;
}

export function getFormulaInlineCommentReferenceText(
  editor: CustomBlockNoteEditor
): string | undefined {
  try {
    const referenceText = getFormulaAwareReferenceTextFromSelection(editor.prosemirrorView);
    if (referenceText) {
      return referenceText;
    }
  } catch {
    // 当前光标状态可能没有可读取的选区。
  }

  try {
    const inlineReference = getInlineMathReferenceFromSelection(editor.prosemirrorView);
    if (inlineReference) {
      return inlineReference;
    }
  } catch {
    // 当前光标状态可能没有可读取的行内公式。
  }

  const getMathExpression = (block: { type: string; props?: Record<string, unknown> }) => {
    if (block.type !== 'math') {
      return undefined;
    }
    const expression = block.props?.expression;
    return typeof expression === 'string' && expression.trim() ? expression : undefined;
  };

  try {
    const selectedExpression = editor.getSelection()?.blocks.map(getMathExpression).find(Boolean);
    if (selectedExpression) {
      return formatFormulaInlineCommentReferenceText(selectedExpression, 'block');
    }
  } catch {
    // 无内容自定义块的节点选区不一定能转换为 BlockNote 选区。
  }

  try {
    const cursorExpression = getMathExpression(editor.getTextCursorPosition().block);
    return cursorExpression
      ? formatFormulaInlineCommentReferenceText(cursorExpression, 'block')
      : undefined;
  } catch {
    return undefined;
  }
}
