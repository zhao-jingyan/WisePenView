import type { Block } from '@/types/note';

export interface NotePageNoteData {
  resourceId: string;
  version: number;
  blocks: Block[];
  /** 最近编辑时间（来自 loadNote 的 updated_at） */
  lastEditedAt?: string;
}

export type NotePageLoadState = 'loading' | 'success' | 'error';

export interface NotePageLocationState {
  fromCreate?: boolean;
  initialNoteData?: NotePageNoteData;
}
