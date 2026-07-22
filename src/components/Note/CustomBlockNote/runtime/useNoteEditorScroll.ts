import { useMemoizedFn, useUnmount } from 'ahooks';
import { useRef } from 'react';

import { findInlineCommentAnchorElement } from '../engines/inlineComments/extension';
import type { NoteEditorAnchor } from '../index.type';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';

export type NoteScrollTargetResolver = () => HTMLElement | null;

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function resolveCurrentBlockElement(editor: CustomBlockNoteEditor): HTMLElement | null {
  const view = editor.prosemirrorView;
  const domNode = view.domAtPos(view.state.selection.from).node;
  const element = domNode instanceof Element ? domNode : domNode.parentElement;
  return element?.closest<HTMLElement>('.bn-block-outer') ?? null;
}

export function useNoteEditorScroll(editor: CustomBlockNoteEditor) {
  const queuedFrameRef = useRef<number | null>(null);

  useUnmount(() => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);
  });

  const scrollToTarget = useMemoizedFn((resolveTarget: NoteScrollTargetResolver) => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);

    queuedFrameRef.current = window.requestAnimationFrame(() => {
      queuedFrameRef.current = null;
      const target = resolveTarget();
      if (!target?.isConnected) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      const scrollContainer = findScrollableAncestor(target);
      if (!scrollContainer) {
        target.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = scrollContainer.scrollTop + targetRect.top - containerRect.top;
      const scrollTop = Math.max(
        0,
        targetTop - (scrollContainer.clientHeight - targetRect.height) / 2
      );
      scrollContainer.scrollTo({ top: scrollTop, behavior });
    });
  });

  const scrollToAnchor = useMemoizedFn((anchor: NoteEditorAnchor) => {
    if (anchor.kind === 'block') {
      try {
        editor.setTextCursorPosition(anchor.blockId, 'start');
        editor.focus();
      } catch {
        editor.focus();
        return;
      }
      const blockElement = resolveCurrentBlockElement(editor);
      scrollToTarget(() => blockElement);
      return;
    }

    scrollToTarget(() =>
      findInlineCommentAnchorElement(editor.prosemirrorView.dom, anchor.threadId)
    );
  });

  return { scrollToAnchor, scrollToTarget };
}
