import { MessageSquare } from 'lucide-react';
import type { RefObject } from 'react';

import type { NoteCommentAnchor } from '../../../content/types';
import { useNoteCommentRuntime } from '../../../engines/comments/runtime/CommentRuntime';
import { INLINE_MATH_COMMENT_OWNER_ID, MATH_BLOCK_COMMENT_OWNER_ID } from './anchor';
import { captureInlineMathAnchor } from './formulaAnchor';
import { formatFormulaReferenceText, type FormulaCommentKind } from './formulaReference';
import styles from './latexFormulaCommentButton.module.less';

type LatexFormulaCommentButtonProps = {
  expression: string;
  kind: FormulaCommentKind;
  shellRef: RefObject<HTMLElement | null>;
  blockId?: string;
};

export function LatexFormulaCommentButton({
  expression,
  kind,
  shellRef,
  blockId,
}: LatexFormulaCommentButtonProps) {
  const comments = useNoteCommentRuntime();

  if (!comments?.canComment) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.formulaCommentButton}
      title="添加批注"
      aria-label="添加批注"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const shellElement = shellRef.current;
        if (!shellElement) {
          return;
        }
        const anchor =
          kind === 'block' && blockId
            ? { kind: 'block' as const, blockId }
            : captureInlineMathAnchor(comments.editor, shellElement);
        const referenceText = formatFormulaReferenceText(expression, kind);
        if (!anchor || !referenceText) return;
        comments.startContentComment({
          ownerId: kind === 'block' ? MATH_BLOCK_COMMENT_OWNER_ID : INLINE_MATH_COMMENT_OWNER_ID,
          anchor: anchor as unknown as NoteCommentAnchor,
          referenceText,
        });
      }}
    >
      <MessageSquare size={14} />
    </button>
  );
}
