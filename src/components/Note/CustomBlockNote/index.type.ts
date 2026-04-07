import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/session/plugins/note/WisepenProvider';

export interface NoteBodyEditorHandle {
  focus: () => void;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: WisepenProvider;
  readOnly?: boolean;
}
