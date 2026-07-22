import type { FormEvent, KeyboardEvent, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useEffectForce } from '@/hooks/useEffectForce';
import popoverStyles from '../InlineMath/style.module.less';
import { sanitizeLatexInput } from '../latexInput';

interface LatexEditPopoverProps {
  /** 为 true 时挂载到 document.body */
  visible: boolean;
  position: { top: number; left: number; width: number } | null;
  /** 标题与 dialog 的 aria-label */
  title: string;
  hint: string;
  textareaClassName: string;
  value: string;
  onValueChange: (value: string) => void;
  onCommit: () => void;
  /** 点击浮层和锚点以外的区域时提交并收起。 */
  onOutsidePress: () => void;
  /**
   * true：仅 Enter（无 Shift）时提交，Shift+Enter 换行（块级多行）。
   * false：Enter / NumpadEnter 即提交（行内、不可换行）。
   */
  commitEnterUnlessShift: boolean;
  onCancel: () => void;
  onBlur: () => void;
  rows: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** 浮层根节点，用于判断焦点和 pointerdown 是否仍在编辑区域内。 */
  rootRef: RefObject<HTMLDivElement | null>;
  /** 公式预览节点，用于将触发编辑的锚点视为编辑区域的一部分。 */
  anchorRef: RefObject<HTMLElement | null>;
}

function handleTextareaKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onCancel: () => void,
  onCommit: () => void,
  commitEnterUnlessShift: boolean
): void {
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
    return;
  }
  if (e.key === 'Enter' || e.key === 'NumpadEnter') {
    if (commitEnterUnlessShift && e.shiftKey) {
      return;
    }
    e.preventDefault();
    onCommit();
  }
}

function handleTextareaBeforeInput(event: FormEvent<HTMLTextAreaElement>): void {
  const data = (event.nativeEvent as InputEvent).data;
  if (!data?.includes('\u001b')) return;
  event.preventDefault();
  event.stopPropagation();
}

/**
 * 行内 / 块级公式共用的 LaTeX 编辑浮层（Portal → body，样式来自 InlineMath/style.module.less）。
 */
export function LatexEditPopover(props: LatexEditPopoverProps) {
  const {
    visible,
    position,
    title,
    hint,
    textareaClassName,
    value,
    onValueChange,
    onCommit,
    onOutsidePress,
    commitEnterUnlessShift,
    onCancel,
    onBlur,
    rows,
    inputRef,
    rootRef,
    anchorRef,
  } = props;

  /**
   * 浮层显示期间监听 document 捕获阶段的 pointerdown，补足编辑器拦截鼠标事件时 textarea
   * 不会触发 blur 的场景；卸载时移除监听，避免关闭后继续响应外部点击。
   */
  useEffectForce(() => {
    if (!visible || position === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target)) return;
      if (anchorRef.current?.contains(event.target)) return;
      onOutsidePress();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [anchorRef, onOutsidePress, position, rootRef, visible]);

  if (!visible || position === null) {
    return null;
  }

  return createPortal(
    <div
      ref={rootRef}
      className={popoverStyles.inlineEditPopover}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      role="dialog"
      aria-label={title}
    >
      <div className={popoverStyles.inlineEditPopoverHeader}>{title}</div>
      <textarea
        ref={inputRef}
        className={textareaClassName}
        value={value}
        onBeforeInput={handleTextareaBeforeInput}
        onChange={(event) => onValueChange(sanitizeLatexInput(event.target.value))}
        onKeyDown={(e) => handleTextareaKeyDown(e, onCancel, onCommit, commitEnterUnlessShift)}
        onBlur={onBlur}
        rows={rows}
        spellCheck={false}
        autoComplete="off"
        aria-label="LaTeX 源码"
      />
      <div className={popoverStyles.inlineEditHint}>{hint}</div>
    </div>,
    document.body
  );
}
