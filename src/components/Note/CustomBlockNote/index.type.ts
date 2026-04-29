import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/session/note/WisepenProvider';
import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';

export interface NoteBodyEditorHandle {
  focus: () => void;
  navigateToBlock: (id: string) => void;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: WisepenProvider;
  readOnly?: boolean;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
}
