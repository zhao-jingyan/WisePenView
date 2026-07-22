import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useImperativeHandle, type Ref } from 'react';

import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { useNoteEditorRuntimeCoordinator } from './registry/useNoteEditorRuntimeCoordinator';
import { useNoteEditorDefinition } from './runtime';
import { NoteEditorSurface } from './ui/NoteEditorSurface';

function CustomBlockNote({
  ref,
  ...props
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const definition = useNoteEditorDefinition(props);
  const editor = useCreateBlockNote(definition.editorOptions);
  const runtimeCoordinator = useNoteEditorRuntimeCoordinator({ editor, definition, props });

  useImperativeHandle(ref, () => runtimeCoordinator.editorHandle, [
    runtimeCoordinator.editorHandle,
  ]);

  return (
    <NoteEditorSurface editor={editor} runtimeCoordinator={runtimeCoordinator} props={props} />
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
