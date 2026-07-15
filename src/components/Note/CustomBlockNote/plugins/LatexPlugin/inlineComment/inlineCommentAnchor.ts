import type { Doc } from 'yjs';

export const MATH_BLOCK_INLINE_COMMENT_OWNER_ID = 'latex.block.math';
export const INLINE_MATH_INLINE_COMMENT_OWNER_ID = 'latex.inline.inlineMath';
export const INLINE_MATH_PM_TYPE = 'inlineMath';

const FORMULA_THREAD_ANCHORS_MAP = 'thread-formula-anchors' as const;

export type FormulaInlineCommentAnchor =
  { kind: 'block'; blockId: string } | { kind: 'inline'; blockId: string; inlineIndex: number };

export function getFormulaInlineCommentAnchorsYMap(doc: Doc) {
  return doc.getMap<unknown>(FORMULA_THREAD_ANCHORS_MAP);
}

export function parseFormulaInlineCommentAnchor(value: unknown): FormulaInlineCommentAnchor | null {
  const anchor =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  if (!anchor || typeof anchor.blockId !== 'string' || !anchor.blockId) {
    return null;
  }
  if (anchor.kind === 'block') {
    return { kind: 'block', blockId: anchor.blockId };
  }
  if (
    anchor.kind === 'inline' &&
    typeof anchor.inlineIndex === 'number' &&
    Number.isInteger(anchor.inlineIndex) &&
    anchor.inlineIndex >= 0
  ) {
    return { kind: 'inline', blockId: anchor.blockId, inlineIndex: anchor.inlineIndex };
  }
  return null;
}

export function isSameFormulaInlineCommentAnchor(
  left: FormulaInlineCommentAnchor,
  right: FormulaInlineCommentAnchor
): boolean {
  return (
    left.kind === right.kind &&
    left.blockId === right.blockId &&
    (left.kind === 'block' || (right.kind === 'inline' && left.inlineIndex === right.inlineIndex))
  );
}
