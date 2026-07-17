import type { CustomBlockNoteProps } from './index.type';
import type { CustomBlockNoteEditor } from './noteEditorComposition';
import {
  useNoteAiDiff,
  useNoteCollaboration,
  useNoteDocument,
  useNoteEditorCommands,
  useNoteEditorHydration,
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

  const document = useNoteDocument({
    editor,
    definition,
    resourceId,
    blockLocalDocWrites,
    onOutlineChange,
    onActiveHeadingChange,
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

  return {
    collaboration,
    document,
    aiDiff,
    commands,
  };
}

export type NoteEditorRuntimeCoordinator = ReturnType<typeof useNoteEditorRuntimeCoordinator>;
