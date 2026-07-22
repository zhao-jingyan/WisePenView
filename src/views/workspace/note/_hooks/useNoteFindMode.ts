import { useEventListener, useMemoizedFn } from 'ahooks';
import { useState, type RefObject } from 'react';

import type {
  NoteBodyEditorHandle,
  NoteFindResult,
  NoteReplaceResult,
} from '@/components/Note/CustomBlockNote/index.type';

interface NoteFindModeState {
  query: string;
  replacement: string;
  result: NoteFindResult | null;
  replaced: number;
}

interface UseNoteFindModeOptions {
  editorRef: RefObject<NoteBodyEditorHandle | null>;
  scopeRef: RefObject<HTMLElement | null>;
  canReplace: boolean;
}

function isEventInScope(event: KeyboardEvent, scope: HTMLElement | null): boolean {
  return event.target instanceof Node && Boolean(scope?.contains(event.target));
}

function isFindInputEvent(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLElement && Boolean(event.target.closest('[role="search"]'));
}

export function useNoteFindMode({ editorRef, scopeRef, canReplace }: UseNoteFindModeOptions) {
  const [mode, setMode] = useState<NoteFindModeState | null>(null);

  const handleQueryChange = useMemoizedFn((query: string) => {
    const result = query.trim() ? (editorRef.current?.findMatches(query) ?? null) : null;
    if (!query.trim()) editorRef.current?.clearFind();
    setMode((currentMode) => ({
      query,
      replacement: currentMode?.replacement ?? '',
      result,
      replaced: 0,
    }));
  });

  const handleOpen = useMemoizedFn((initialQuery?: string) => {
    const shouldCollapseSelection = mode !== null;
    if (initialQuery === undefined) {
      setMode(
        (currentMode) => currentMode ?? { query: '', replacement: '', result: null, replaced: 0 }
      );
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

  const handleReplacementChange = useMemoizedFn((replacement: string) => {
    setMode((currentMode) =>
      currentMode ? { ...currentMode, replacement, replaced: 0 } : currentMode
    );
  });

  const applyReplaceResult = useMemoizedFn((result: NoteReplaceResult) => {
    setMode((currentMode) =>
      currentMode
        ? { ...currentMode, result: result.result, replaced: result.replaced }
        : currentMode
    );
  });

  const handleReplaceCurrent = useMemoizedFn(() => {
    if (!mode || !canReplace) return;
    applyReplaceResult(
      editorRef.current?.replaceCurrent(mode.replacement) ?? { replaced: 0, result: null }
    );
  });

  const handleReplaceAll = useMemoizedFn(() => {
    if (!mode || !canReplace) return;
    applyReplaceResult(
      editorRef.current?.replaceAll(mode.replacement) ?? { replaced: 0, result: null }
    );
  });

  const handleClose = useMemoizedFn(() => {
    editorRef.current?.clearFind();
    setMode(null);
    editorRef.current?.focus();
  });

  const handleModeKeyDown = useMemoizedFn((event: KeyboardEvent) => {
    if (!mode || event.isComposing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
      return;
    }

    if (!isEventInScope(event, scopeRef.current)) return;

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
      if (event.ctrlKey || event.metaKey) {
        if (event.shiftKey) {
          handleReplaceAll();
        } else {
          handleReplaceCurrent();
        }
        return;
      }
      if (event.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
      return;
    }
  });

  useEventListener('keydown', handleModeKeyDown, { target: document, capture: true });

  return {
    findMode: mode,
    isFindModeActive: mode !== null,
    openFind: handleOpen,
    closeFind: handleClose,
    changeFindQuery: handleQueryChange,
    changeReplacement: handleReplacementChange,
    findNext: handleNext,
    findPrevious: handlePrevious,
    replaceCurrent: handleReplaceCurrent,
    replaceAll: handleReplaceAll,
    canReplace,
  };
}
