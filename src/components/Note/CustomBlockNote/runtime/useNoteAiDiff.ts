import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { useState } from 'react';
import type * as Y from 'yjs';

import { useAiDiffSidecar } from '../engines/aiDiff/useAiDiffSidecar';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

export function useNoteAiDiff({
  editor,
  definition,
  doc,
  undoManager,
  aiDiffDisplayMode,
  readOnly,
  blockLocalDocWrites,
  onPresenceChange,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  doc: CustomBlockNoteProps['collaboration']['doc'];
  undoManager: Y.UndoManager;
  aiDiffDisplayMode: AiDiffDisplayMode;
  readOnly: boolean;
  blockLocalDocWrites: boolean;
  onPresenceChange: CustomBlockNoteProps['onAiDiffPresenceChange'];
}) {
  const [exportDisplayModeOverride, setExportDisplayModeOverride] =
    useState<AiDiffDisplayMode | null>(null);
  const effectiveDisplayMode = exportDisplayModeOverride ?? aiDiffDisplayMode;
  const hasContent = useAiDiffSidecar({
    doc,
    noteFragment: definition.noteFragment,
    editor,
    registry: notePluginRegistry,
    displayMode: effectiveDisplayMode,
    readOnly: readOnly || blockLocalDocWrites,
    undoManager,
    onPresenceChange,
  });

  return {
    showBulkActions:
      hasContent &&
      !readOnly &&
      !blockLocalDocWrites &&
      aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE,
    setExportDisplayModeOverride,
  };
}
