import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import type { NoteSelectionSnapshot, SelectedNoteScope } from '@/domains/Note';
import { computeNoteBodyContentHash } from '@/domains/Note';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';

import type { CustomBlockNoteProps } from '../index.type';
import type { CustomBlockNoteEditor } from '../noteEditorComposition';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

function buildSelectedNoteScope(editor: CustomBlockNoteEditor): SelectedNoteScope | null {
  const selectedBlocks = editor.getSelection()?.blocks;
  if (!selectedBlocks?.length) return null;
  const startBlockId = selectedBlocks[0]?.id;
  const endBlockId = selectedBlocks[selectedBlocks.length - 1]?.id;
  if (!startBlockId || !endBlockId) return null;
  return { type: 'blockRange', startBlockId, endBlockId };
}

export function useNoteDocument({
  editor,
  definition,
  resourceId,
  blockLocalDocWrites,
  onAskAi,
  onAiDiffBodyContentHashChange,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  resourceId: string;
  blockLocalDocWrites: boolean;
  onAskAi: CustomBlockNoteProps['onAskAi'];
  onAiDiffBodyContentHashChange: CustomBlockNoteProps['onAiDiffBodyContentHashChange'];
}) {
  const bodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const selectionSnapshotRef = useRef<NoteSelectionSnapshot | undefined>(undefined);
  const bodyContentHashTimerRef = useRef<number | null>(null);

  const refreshBodyContentHash = useMemoizedFn(() => {
    const nextHash = computeNoteBodyContentHash(editor.document);
    onAiDiffBodyContentHashChange?.(nextHash);
  });

  const scheduleBodyContentHashRefresh = useMemoizedFn(() => {
    onAiDiffBodyContentHashChange?.(undefined);
    if (bodyContentHashTimerRef.current !== null) {
      window.clearTimeout(bodyContentHashTimerRef.current);
    }
    bodyContentHashTimerRef.current = window.setTimeout(() => {
      bodyContentHashTimerRef.current = null;
      refreshBodyContentHash();
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

    bodyOnChangeCleanupRef.current = editor.onChange(() => {
      activateWriteGuard();
      scheduleBodyContentHashRefresh();

      const newNoteState = useNewNoteStore.getState();
      if (
        newNoteState.newNoteResourceId === resourceId &&
        editor.blocksToMarkdownLossy().trim().length > 0
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
    if (bodyContentHashTimerRef.current !== null) {
      window.clearTimeout(bodyContentHashTimerRef.current);
      bodyContentHashTimerRef.current = null;
    }
  });

  const captureSelection = () => {
    selectionSnapshotRef.current = {
      text: editor.getSelectedText(),
      scope: buildSelectedNoteScope(editor),
    };
  };

  const handleAskAi = () => {
    const selectedText =
      editor.getSelectedText().trim() || selectionSnapshotRef.current?.text.trim() || '';
    if (!selectedText) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    onAskAi({
      text: selectedText,
      scope: buildSelectedNoteScope(editor) ?? selectionSnapshotRef.current?.scope ?? null,
    });
  };

  return {
    scheduleBodyContentHashRefresh,
    captureSelection,
    handleAskAi,
  };
}
