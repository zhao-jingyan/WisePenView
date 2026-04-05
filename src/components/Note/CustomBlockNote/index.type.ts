import type { NoteInstance } from '@/session/plugins/note/NoteInstance';

export interface NoteBodyEditorHandle {
  focus: () => void;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  instance: NoteInstance;
}
