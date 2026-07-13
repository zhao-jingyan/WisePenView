import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useMount, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';

import { getRootDomSelection } from '@/components/Note/CustomBlockNote/engines/editor/dom';
import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/noteEditor';

type FloatingToolbarState = {
  visible: boolean;
  left: number;
  top: number;
};

function getDomSelectionToolbarState(view: EditorView): FloatingToolbarState {
  const selection = getRootDomSelection(view.root);
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return { visible: false, left: 0, top: 0 };
  }
  const editorDom = view.dom;
  const range = selection.getRangeAt(0);
  const anchorNode = range.commonAncestorContainer;
  if (
    !editorDom.contains(
      anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement
    )
  ) {
    return { visible: false, left: 0, top: 0 };
  }
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return { visible: false, left: 0, top: 0 };
  }
  return {
    visible: true,
    left: rect.left + rect.width / 2,
    top: Math.max(8, rect.top - 10),
  };
}

function getSafeToolbarState(view: EditorView): FloatingToolbarState {
  const { selection, doc } = view.state;
  if (selection.empty) {
    return getDomSelectionToolbarState(view);
  }
  if (
    selection instanceof TextSelection &&
    doc.textBetween(selection.from, selection.to).length === 0
  ) {
    return getDomSelectionToolbarState(view);
  }

  try {
    const fromRect = view.coordsAtPos(selection.from);
    const toRect = view.coordsAtPos(selection.to);
    const left = (fromRect.left + toRect.right) / 2;
    const top = Math.min(fromRect.top, toRect.top);
    return {
      visible: true,
      left,
      top: Math.max(8, top - 10),
    };
  } catch {
    return getDomSelectionToolbarState(view);
  }
}

export function useFloatingToolbarState(editor: CustomBlockNoteEditor): FloatingToolbarState {
  const [toolbarState, setToolbarState] = useState<FloatingToolbarState>({
    visible: false,
    left: 0,
    top: 0,
  });
  const frameRef = useRef<number | null>(null);

  const syncToolbarState = () => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const next = getSafeToolbarState(editor.prosemirrorView);
      setToolbarState((prev) =>
        prev.visible === next.visible && prev.left === next.left && prev.top === next.top
          ? prev
          : next
      );
    });
  };

  useMount(() => {
    const tiptapEditor = editor._tiptapEditor;
    tiptapEditor.on('selectionUpdate', syncToolbarState);
    tiptapEditor.on('update', syncToolbarState);
    document.addEventListener('selectionchange', syncToolbarState);
    document.addEventListener('pointerup', syncToolbarState, true);
    document.addEventListener('keyup', syncToolbarState, true);
    return () => {
      tiptapEditor.off('selectionUpdate', syncToolbarState);
      tiptapEditor.off('update', syncToolbarState);
      document.removeEventListener('selectionchange', syncToolbarState);
      document.removeEventListener('pointerup', syncToolbarState, true);
      document.removeEventListener('keyup', syncToolbarState, true);
    };
  });

  useUnmount(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  });

  return toolbarState;
}
