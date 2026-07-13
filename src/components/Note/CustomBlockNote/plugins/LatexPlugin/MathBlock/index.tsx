/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type {
  BlockConfig,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import type { ComponentType } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useEffectForce } from '@/hooks/useEffectForce';
import 'katex/dist/katex.min.css';
import type { NoteCommentAnchor } from '../../../content/types';
import { useNoteCommentRuntime } from '../../../engines/comments/runtime/CommentRuntime';
import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { MATH_BLOCK_COMMENT_OWNER_ID } from '../comments/anchor';
import { formatFormulaReferenceText } from '../comments/formulaReference';
import { LatexFormulaCommentButton } from '../comments/LatexFormulaCommentButton';
import { useMathBlockCommentHighlight } from '../comments/useMathBlockThreadMarkClasses';
import popoverStyles from '../InlineMath/style.module.less';
import { renderKatexInto } from '../katexRender';
import { LatexEditPopover } from '../LatexEditPopover';
import {
  computeLatexPopoverPlacement,
  isLatexPopoverAnchorMeasurable,
} from '../LatexEditPopover/latexPopoverGeometry';
import { useFocusPopoverTextarea } from '../LatexEditPopover/useFocusPopoverTextarea';
import { useLatexPopoverAnchorSync } from '../LatexEditPopover/useLatexPopoverAnchorSync';
import styles from './style.module.less';

const mathBlockPropSchema = {
  expression: {
    default: '',
  },
  autoEdit: {
    default: false,
  },
} as const;

const mathBlockConfig: BlockConfig<'math', typeof mathBlockPropSchema, 'none'> = {
  type: 'math',
  propSchema: mathBlockPropSchema,
  content: 'none',
};

type MathBlockProps = {
  expression: string;
  autoEdit: boolean;
};
type MathBlockData = {
  id: string;
  props: MathBlockProps;
  children: unknown[];
};
type MathBlockRenderProps = {
  block: MathBlockData;
  editor: BlockNoteEditor<Record<'math', BlockConfig<'math', typeof mathBlockPropSchema, 'none'>>>;
  contentRef: (node: HTMLElement | null) => void;
};
function MathFormulaPreview({ expression, className }: { expression: string; className: string }) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffectForce(() => {
    const el = mathRef.current;
    if (!el) return;
    renderKatexInto(el, expression, styles.mathPlaceholder, true);
  }, [expression]);

  return <div ref={mathRef} className={className} />;
}

function MathBlockView(props: MathBlockRenderProps) {
  const readOnly = useNoteEditorReadOnlyContext();
  const comments = useNoteCommentRuntime();

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(props.block.props.expression);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openValueRef = useRef(props.block.props.expression);
  const blurCommitTimerRef = useRef<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const clearPopoverPos = useCallback(() => {
    setPopoverPos(null);
  }, []);

  const measurePopoverPosition = useCallback(() => {
    const el = shellRef.current;
    if (!el) {
      return false;
    }
    const r = el.getBoundingClientRect();
    if (!isLatexPopoverAnchorMeasurable(r)) {
      return false;
    }
    const minW = 280;
    const maxW = 480;
    const estHeight = 220;
    setPopoverPos(computeLatexPopoverPlacement(r, { minWidth: minW, maxWidth: maxW, estHeight }));
    return true;
  }, []);

  useLatexPopoverAnchorSync(isEditing, shellRef, measurePopoverPosition, clearPopoverPos);

  // TODO: 重构，不使用useEffect，使用更合适的语义以增加可读性，但是latexSupport有完全重构的可能，因此暂时保留
  useEffectForce(() => {
    if (isEditing) return;
    setValue(props.block.props.expression);
  }, [props.block.props.expression, isEditing]);

  useFocusPopoverTextarea(isEditing, popoverPos, inputRef);

  useEffectForce(() => {
    if (readOnly) return;
    if (!props.block.props.autoEdit) return;
    openValueRef.current = props.block.props.expression;
    setValue(props.block.props.expression);
    setIsEditing(true);
    props.editor.updateBlock(props.block, {
      props: { ...props.block.props, autoEdit: false },
    });
  }, [props.block, props.block.props, props.editor]);

  const focusStartOfBlockAfterMath = () => {
    const { editor, block } = props;
    // 渲染上下文里 editor 的 schema 仅包含 math，自身无法直接 `insertBlocks([{type:'paragraph'}])`。
    // 这里向 BlockNote 顶层 editor 类型放宽，便于复用默认块（paragraph）。
    const ed = editor as unknown as BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;
    const next = ed.getNextBlock(block);
    try {
      if (next) {
        ed.setTextCursorPosition(next.id, 'start');
      } else {
        const inserted = ed.insertBlocks([{ type: 'paragraph' }], block, 'after');
        const first = inserted[0];
        if (first) {
          ed.setTextCursorPosition(first.id, 'start');
        }
      }
      ed.focus();
    } catch {
      ed.focus();
    }
  };

  const scheduleCancelBlurCommitAndFocusNext = () => {
    window.setTimeout(() => {
      if (blurCommitTimerRef.current !== null) {
        clearTimeout(blurCommitTimerRef.current);
        blurCommitTimerRef.current = null;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusStartOfBlockAfterMath();
        });
      });
    }, 0);
  };

  const commit = (focusNextLine = false) => {
    props.editor.updateBlock(props.block, {
      props: { ...props.block.props, expression: value.trim() },
    });
    if (focusNextLine) {
      scheduleCancelBlurCommitAndFocusNext();
    }
    setIsEditing(false);
  };

  const cancel = () => {
    if (blurCommitTimerRef.current !== null) {
      clearTimeout(blurCommitTimerRef.current);
      blurCommitTimerRef.current = null;
    }
    window.setTimeout(() => {
      if (blurCommitTimerRef.current !== null) {
        clearTimeout(blurCommitTimerRef.current);
        blurCommitTimerRef.current = null;
      }
    }, 0);
    setValue(openValueRef.current);
    setIsEditing(false);
  };

  const enterEdit = () => {
    if (readOnly) return;
    openValueRef.current = props.block.props.expression;
    setValue(props.block.props.expression);
    setIsEditing(true);
  };

  const handleTextareaBlur = () => {
    if (blurCommitTimerRef.current !== null) {
      clearTimeout(blurCommitTimerRef.current);
    }
    blurCommitTimerRef.current = window.setTimeout(() => {
      blurCommitTimerRef.current = null;
      const shell = shellRef.current;
      const pop = popoverRef.current;
      const active = document.activeElement;
      if (shell && active && shell.contains(active)) return;
      if (pop && active && pop.contains(active)) return;
      commit();
    }, 0);
  };

  const blockFormulaAnchor = useMemo(
    () => ({ kind: 'block' as const, blockId: props.block.id }),
    [props.block.id]
  );
  const blockCommentTarget = useMemo(
    () => ({
      ownerId: MATH_BLOCK_COMMENT_OWNER_ID,
      anchor: blockFormulaAnchor as unknown as NoteCommentAnchor,
    }),
    [blockFormulaAnchor]
  );
  const commentHighlight = useMathBlockCommentHighlight({
    commentEditor: comments?.editor ?? (props.editor as unknown as CustomBlockNoteEditor),
    target: blockCommentTarget,
    revisionKey: String(props.block.props.expression ?? ''),
    comments,
  });
  const commentHighlightClass = [
    commentHighlight.commented ? styles.mathBlockCommented : '',
    commentHighlight.selected ? styles.mathBlockSelected : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shellClass = `${styles.mathShell} ${styles.mathShellBlock}`;
  const previewClass = styles.mathPreview;
  const editTitle = '编辑 LaTeX（独立）';
  const canEnterEdit = !readOnly && !isEditing;
  const rootClass = canEnterEdit
    ? styles.mathRoot
    : `${styles.mathRoot} ${styles.mathRootReadonly}`;

  const editPopover = (
    <LatexEditPopover
      visible={Boolean(isEditing && popoverPos)}
      position={popoverPos}
      title={editTitle}
      hint="Enter 确定 · Shift+Enter 换行 · Esc 取消"
      textareaClassName={`${popoverStyles.inlineEditTextarea} ${styles.blockPopoverTextarea}`}
      value={value}
      onChange={(e) => {
        const nextValue = e.target.value;
        setValue(nextValue);
        const referenceText = formatFormulaReferenceText(nextValue, 'block');
        if (referenceText) {
          comments?.updateContentCommentReference({
            ...blockCommentTarget,
            referenceText,
          });
        }
      }}
      onCommit={() => commit(true)}
      commitEnterUnlessShift
      onCancel={cancel}
      onBlur={handleTextareaBlur}
      rows={3}
      inputRef={inputRef}
      rootRef={popoverRef}
    />
  );

  return (
    <div ref={shellRef} contentEditable={false} className={`${shellClass} bn-math-block-root`}>
      {!isEditing ? (
        <LatexFormulaCommentButton
          expression={props.block.props.expression}
          kind="block"
          shellRef={shellRef}
          blockId={props.block.id}
        />
      ) : null}
      <div
        className={`${rootClass} ${commentHighlightClass}`}
        role={canEnterEdit ? 'button' : undefined}
        tabIndex={canEnterEdit ? 0 : -1}
        aria-label={canEnterEdit ? '编辑独立公式' : undefined}
        onClick={() => {
          if (canEnterEdit) enterEdit();
        }}
        onKeyDown={(e) => {
          if (!canEnterEdit) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            enterEdit();
          }
        }}
      >
        <MathFormulaPreview
          expression={isEditing ? value : props.block.props.expression}
          className={previewClass}
        />
      </div>
      {editPopover}
    </div>
  );
}

type MathBlockExternalProps = MathBlockRenderProps & {
  context: { nestingLevel: number };
};

type MathBlockSpec = ReturnType<ReturnType<typeof createReactBlockSpec>>;
const createMathBlockSpecUnsafe = createReactBlockSpec as unknown as (
  blockConfig: typeof mathBlockConfig,
  blockImplementation: {
    render: ComponentType<MathBlockRenderProps>;
    toExternalHTML: ComponentType<MathBlockExternalProps>;
  }
) => () => MathBlockSpec;

/** Markdown / 外部 HTML：行间公式 `$$\n...\n$$`，避免使用编辑器内 KaTeX DOM */
function MathBlockToExternalHTML(props: MathBlockExternalProps) {
  void props.context;
  const expr = String(props.block.props.expression ?? '').trim();
  const payload = expr === '' ? '$$\n\n$$' : `$$\n${expr}\n$$`;
  return (
    <div className={`${styles.mathExportRoot} bn-math-block-export-md`} contentEditable={false}>
      {payload}
    </div>
  );
}

/** KaTeX 独立公式块；预览在文档内，编辑区与行内公式一致为 body 挂载的浮层 */
export const createMathBlockSpec = createMathBlockSpecUnsafe(mathBlockConfig, {
  render: MathBlockView as ComponentType<MathBlockRenderProps>,
  toExternalHTML: MathBlockToExternalHTML as ComponentType<MathBlockExternalProps>,
});
