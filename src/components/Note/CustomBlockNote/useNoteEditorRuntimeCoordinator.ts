import { useMemoizedFn } from 'ahooks';

import type { CustomBlockNoteProps } from './index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from './noteEditorComposition';
import {
  useNoteAiDiff,
  useNoteCollaboration,
  useNoteDocument,
  useNoteEditorCommands,
  useNoteEditorHydration,
  useNoteOutlineRuntime,
  type NoteEditorDefinition,
} from './runtime';

export function useNoteEditorRuntimeCoordinator({
  editor,
  definition,
  props,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  props: CustomBlockNoteProps;
}) {
  const {
    resourceId,
    collaboration: collaborationBinding,
    state: { aiDiffDisplayMode, readOnly, blockLocalDocWrites },
    aiDiffPreview,
    onOutlineChange,
    onActiveHeadingChange,
    onAiDiffPresenceChange,
    onAskAi,
    onAiDiffBodyContentHashChange,
  } = props;
  const collaboration = useNoteCollaboration({
    editor,
    definition,
    collaboration: collaborationBinding,
    readOnly,
  });

  const aiDiff = useNoteAiDiff({
    editor,
    definition,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    aiDiffDisplayMode,
    readOnly,
    blockLocalDocWrites,
    onPresenceChange: onAiDiffPresenceChange,
  });

  const outlineRuntime = useNoteOutlineRuntime({
    editor,
    registry: notePluginRegistry,
    onOutlineChange,
    onActiveItemChange: onActiveHeadingChange,
  });

  const document = useNoteDocument({
    editor,
    definition,
    resourceId,
    blockLocalDocWrites,
    onAskAi,
    onAiDiffBodyContentHashChange,
  });

  useNoteEditorHydration({
    editor,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    resourceId,
    collaborationReady: collaborationBinding.ready,
    aiDiffPreview,
    scheduleBodyContentHashRefresh: document.scheduleBodyContentHashRefresh,
  });
  const commands = useNoteEditorCommands(editor, aiDiff.setExportDisplayModeOverride);
  const handleSelectionChange = useMemoizedFn(() => {
    document.captureSelection();
    outlineRuntime.syncActiveItem();
  });

  return {
    collaboration,
    document,
    aiDiff,
    commands,
    handleSelectionChange,
  };
}

export type NoteEditorRuntimeCoordinator = ReturnType<typeof useNoteEditorRuntimeCoordinator>;
