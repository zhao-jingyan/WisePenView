import { useMount, useUpdateEffect } from 'ahooks';

import { AI_DIFF_ACTION_ORIGIN } from '../engines/aiDiff/store';
import { useNoteCaptureKeyEvent } from '../engines/collaboration/useNoteCaptureKeyEvent';
import {
  useAttachNoteYjsUndoStack,
  useNoteYjsUndoManager,
} from '../engines/collaboration/useNoteYjsUndoStack';
import type { CustomBlockNoteProps } from '../index.type';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

type CollaborationUser = CustomBlockNoteProps['collaboration']['user'];
type YCursorExtensionHandle = {
  updateUser?: (user: CollaborationUser) => void;
};

const AI_DIFF_TRACKED_ORIGINS = [AI_DIFF_ACTION_ORIGIN] as const;

export function useNoteCollaboration({
  editor,
  definition,
  collaboration: { doc, provider, user: collaborationUser },
  readOnly,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  collaboration: CustomBlockNoteProps['collaboration'];
  readOnly: boolean;
}) {
  const undoManager = useNoteYjsUndoManager(
    definition.noteFragment,
    definition.aiContentStore,
    editor,
    AI_DIFF_TRACKED_ORIGINS
  );

  const syncCollaborationUser = () => {
    const yCursor = editor.getExtension('yCursor') as YCursorExtensionHandle | undefined;
    yCursor?.updateUser?.(collaborationUser);
  };

  useMount(() => {
    syncCollaborationUser();
  });

  useUpdateEffect(() => {
    syncCollaborationUser();
  }, [collaborationUser, editor]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);
  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  return {
    undoManager,
    onKeyDownCapture,
  };
}
