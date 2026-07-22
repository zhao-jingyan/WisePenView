import { useEventListener, useMemoizedFn } from 'ahooks';
import { useState, type RefObject } from 'react';

import type {
  NoteBodyEditorHandle,
  NoteFindResult,
} from '@/components/Note/CustomBlockNote/index.type';

interface NoteFindModeState {
  query: string;
  result: NoteFindResult | null;
}

interface UseNoteFindModeOptions {
  editorRef: RefObject<NoteBodyEditorHandle | null>;
  scopeRef: RefObject<HTMLElement | null>;
}

function isEventInScope(event: KeyboardEvent, scope: HTMLElement | null): boolean {
  return event.target instanceof Node && Boolean(scope?.contains(event.target));
}

function isFindInputEvent(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLElement && Boolean(event.target.closest('[role="search"]'));
}

export function useNoteFindMode({ editorRef, scopeRef }: UseNoteFindModeOptions) {
  const [mode, setMode] = useState<NoteFindModeState | null>(null);

  const handleQueryChange = useMemoizedFn((query: string) => {
    const result = query.trim() ? (editorRef.current?.findMatches(query) ?? null) : null;
    if (!query.trim()) editorRef.current?.clearFind();
    setMode({ query, result });
  });

  const handleOpen = useMemoizedFn((initialQuery?: string) => {
    const shouldCollapseSelection = mode !== null;
    if (initialQuery === undefined) {
      setMode((currentMode) => currentMode ?? { query: '', result: null });
    } else {
      handleQueryChange(initialQuery);
    }

    if (shouldCollapseSelection) editorRef.current?.collapseSelection();
  });

  const handleNext = useMemoizedFn(() => {
    const result = editorRef.current?.findNext() ?? null;
    setMode((currentMode) => (currentMode ? { ...currentMode, result } : currentMode));
  });

  const handlePrevious = useMemoizedFn(() => {
    const result = editorRef.current?.findPrev() ?? null;
    setMode((currentMode) => (currentMode ? { ...currentMode, result } : currentMode));
  });

  const handleClose = useMemoizedFn(() => {
    editorRef.current?.clearFind();
    setMode(null);
    editorRef.current?.focus();
  });

  const handleModeKeyDown = useMemoizedFn((event: KeyboardEvent) => {
    if (!mode || event.isComposing || !isEventInScope(event, scopeRef.current)) return;

    if (
      !event.altKey &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'f' &&
      isFindInputEvent(event)
    ) {
      event.preventDefault();
      event.stopPropagation();
      editorRef.current?.collapseSelection();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }
  });

  useEventListener('keydown', handleModeKeyDown, { target: document, capture: true });

  return {
    findMode: mode,
    isFindModeActive: mode !== null,
    openFind: handleOpen,
    closeFind: handleClose,
    changeFindQuery: handleQueryChange,
    findNext: handleNext,
    findPrevious: handlePrevious,
  };
}
