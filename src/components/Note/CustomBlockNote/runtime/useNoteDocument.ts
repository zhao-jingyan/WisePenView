import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import type { NoteSelectionSnapshot, SelectedNoteScope } from '@/domains/Note';
import { computeNoteBodyContentHash } from '@/domains/Note';
import { getNearestBlockPos } from '@blocknote/core';
import { toast } from '@heroui/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';

import type { CustomBlockNoteProps } from '../index.type';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteTransactionService } from '../registry/types';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

interface NoteSelectionRangeSnapshot {
  doc: PMNode;
  from: number;
  to: number;
}

function readSelectionRange(editor: CustomBlockNoteEditor): NoteSelectionRangeSnapshot | null {
  const { doc, selection } = editor.prosemirrorState;
  if (selection.empty || selection.from === selection.to) return null;
  return { doc, from: selection.from, to: selection.to };
}

function buildSelectedNoteScope(selection: NoteSelectionRangeSnapshot): SelectedNoteScope | null {
  let startBlockId: unknown;
  let endBlockId: unknown;
  try {
    startBlockId = getNearestBlockPos(selection.doc, selection.from).node.attrs.id;
    endBlockId = getNearestBlockPos(selection.doc, selection.to).node.attrs.id;
  } catch {
    return null;
  }
  if (!startBlockId || !endBlockId) return null;
  if (typeof startBlockId !== 'string' || typeof endBlockId !== 'string') return null;
  return { type: 'blockRange', startBlockId, endBlockId };
}

function buildSelectionSnapshot(selection: NoteSelectionRangeSnapshot): NoteSelectionSnapshot {
  return {
    text: selection.doc.textBetween(selection.from, selection.to),
    scope: buildSelectedNoteScope(selection),
  };
}

export function useNoteDocument({
  editor,
  definition,
  transactions,
  resourceId,
  blockLocalDocWrites,
  onAskAi,
  onAiDiffBodyContentHashChange,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  transactions: NoteTransactionService;
  resourceId: string;
  blockLocalDocWrites: boolean;
  onAskAi: CustomBlockNoteProps['onAskAi'];
  onAiDiffBodyContentHashChange: CustomBlockNoteProps['onAiDiffBodyContentHashChange'];
}) {
  const bodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const selectionRangeSnapshotRef = useRef<NoteSelectionRangeSnapshot | null>(null);
  const bodyContentHashTimerRef = useRef<number | null>(null);
  const bodyContentHashIdleRef = useRef<number | null>(null);
  const bodyContentHashInvalidatedRef = useRef(false);

  const refreshBodyContentHash = useMemoizedFn(() => {
    bodyContentHashIdleRef.current = null;
    bodyContentHashInvalidatedRef.current = false;
    const nextHash = computeNoteBodyContentHash(editor.document);
    onAiDiffBodyContentHashChange?.(nextHash);
  });

  const cancelPendingBodyContentHashRefresh = useMemoizedFn(() => {
    if (bodyContentHashTimerRef.current !== null) {
      window.clearTimeout(bodyContentHashTimerRef.current);
      bodyContentHashTimerRef.current = null;
    }
    if (bodyContentHashIdleRef.current !== null) {
      const idleWindow = window as Window & { cancelIdleCallback?: (handle: number) => void };
      idleWindow.cancelIdleCallback?.(bodyContentHashIdleRef.current);
      bodyContentHashIdleRef.current = null;
    }
  });

  const scheduleBodyContentHashRefresh = useMemoizedFn(() => {
    if (!bodyContentHashInvalidatedRef.current) {
      bodyContentHashInvalidatedRef.current = true;
      onAiDiffBodyContentHashChange?.(undefined);
    }
    cancelPendingBodyContentHashRefresh();
    bodyContentHashTimerRef.current = window.setTimeout(() => {
      bodyContentHashTimerRef.current = null;
      const idleWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      };
      if (idleWindow.requestIdleCallback) {
        bodyContentHashIdleRef.current = idleWindow.requestIdleCallback(refreshBodyContentHash, {
          timeout: 500,
        });
        return;
      }
      bodyContentHashTimerRef.current = window.setTimeout(refreshBodyContentHash, 0);
    }, 120);
  });

  useMount(scheduleBodyContentHashRefresh);

  useUpdateEffect(scheduleBodyContentHashRefresh, [editor]);

  useMount(() => {
    let writeGuardActivated = false;
    const activateWriteGuard = () => {
      if (writeGuardActivated || !definition.hasBlockLocalDocWritesProp()) {
        return;
      }
      writeGuardActivated = true;
      definition.setPmWriteGuardReady(true);
    };

    bodyOnChangeCleanupRef.current = transactions.subscribe(editor, (analysis) => {
      if (!analysis.docChanged) return;
      activateWriteGuard();
      scheduleBodyContentHashRefresh();

      const newNoteState = useNewNoteStore.getState();
      if (newNoteState.newNoteResourceId !== resourceId || analysis.changedBlocks.length === 0) {
        return;
      }
      const changedBlocks = analysis.changedBlocks
        .map(({ id }) => editor.getBlock(id))
        .filter((block): block is NonNullable<typeof block> => Boolean(block));
      if (
        changedBlocks.length > 0 &&
        editor.blocksToMarkdownLossy(changedBlocks).trim().length > 0
      ) {
        newNoteState.markNewNoteDirty(resourceId);
      }
    });

    if (definition.hasBlockLocalDocWritesProp()) {
      window.requestAnimationFrame(activateWriteGuard);
    }
  });

  useUpdateEffect(() => {
    if (!blockLocalDocWrites) {
      definition.setPmWriteGuardReady(false);
    }
  }, [blockLocalDocWrites]);

  useUnmount(() => {
    bodyOnChangeCleanupRef.current?.();
    bodyOnChangeCleanupRef.current = null;
    cancelPendingBodyContentHashRefresh();
  });

  const captureSelection = () => {
    const selection = readSelectionRange(editor);
    if (selection) selectionRangeSnapshotRef.current = selection;
  };

  const handleAskAi = () => {
    const selection = readSelectionRange(editor) ?? selectionRangeSnapshotRef.current;
    const snapshot = selection ? buildSelectionSnapshot(selection) : null;
    const selectedText = snapshot?.text.trim() ?? '';
    if (!selectedText) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    if (bodyContentHashInvalidatedRef.current) {
      cancelPendingBodyContentHashRefresh();
      refreshBodyContentHash();
    }

    onAskAi({
      text: selectedText,
      scope: snapshot?.scope ?? null,
    });
  };

  return {
    scheduleBodyContentHashRefresh,
    captureSelection,
    handleAskAi,
  };
}
