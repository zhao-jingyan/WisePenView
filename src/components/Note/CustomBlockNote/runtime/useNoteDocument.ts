import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import type { NoteSelectionSnapshot, SelectedNoteScope } from '@/domains/Note';
import { computeNoteBodyContentHash } from '@/domains/Note';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';

import { buildOutlineProjection, resolveActiveHeadingId } from '../content/outline';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';
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
  onOutlineChange,
  onActiveHeadingChange,
  onAskAi,
  onAiDiffBodyContentHashChange,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  resourceId: string;
  blockLocalDocWrites: boolean;
  onOutlineChange: CustomBlockNoteProps['onOutlineChange'];
  onActiveHeadingChange: CustomBlockNoteProps['onActiveHeadingChange'];
  onAskAi: CustomBlockNoteProps['onAskAi'];
  onAiDiffBodyContentHashChange: CustomBlockNoteProps['onAiDiffBodyContentHashChange'];
}) {
  const bodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const selectionSnapshotRef = useRef<NoteSelectionSnapshot | undefined>(undefined);
  const flatBlocksRef = useRef<ReturnType<typeof buildOutlineProjection>['flatBlocks']>([]);
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

    const syncOutlineProjection = () => {
      if (!onOutlineChange && !onActiveHeadingChange) return;
      const projection = buildOutlineProjection(editor, notePluginRegistry);
      flatBlocksRef.current = projection.flatBlocks;
      onOutlineChange?.(projection.items);
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
      syncOutlineProjection();
    });

    syncOutlineProjection();

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

  const handleSelectionChange = () => {
    selectionSnapshotRef.current = {
      text: editor.getSelectedText(),
      scope: buildSelectedNoteScope(editor),
    };
    if (!onActiveHeadingChange) {
      return;
    }
    let activeId: string | undefined;
    try {
      const cursor = editor.getTextCursorPosition();
      const currentId = cursor.block?.id;
      if (!currentId) {
        onActiveHeadingChange(undefined);
        return;
      }
      activeId = resolveActiveHeadingId(flatBlocksRef.current, currentId);
    } catch {
      activeId = undefined;
    }
    onActiveHeadingChange(activeId);
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
    handleSelectionChange,
    handleAskAi,
  };
}
