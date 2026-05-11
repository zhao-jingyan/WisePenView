import type { Block, NoteInfoResponse } from '@/types/note';

export interface AddNoteApiRequest {
  title: string;
  initial_content?: Block[];
  source?: string;
}

export type AddNoteApiResponse = string;

export interface GetNoteInfoApiRequest {
  resourceId: string;
}

export type GetNoteInfoApiResponse = NoteInfoResponse;
