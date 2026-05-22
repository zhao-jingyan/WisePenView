import type { Doc } from 'yjs';

import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import type { WisepenProvider } from '@/domains/Note';
import type { AiDiffDisplayMode } from '@/domains/Note/enum';

export interface NoteBodyEditorHandle {
  focus: () => void;
  navigateToBlock: (id: string) => void;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  doc: Doc;
  provider: WisepenProvider;
  aiDiffDisplayMode: AiDiffDisplayMode;
  readOnly?: boolean;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
}
