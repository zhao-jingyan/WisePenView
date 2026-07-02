import type { Block, NoteInfoResponse } from '@/domains/Note';

export interface AddNoteApiRequest {
  title: string;
  resourceType?: string;
  initial_content?: Block[];
  source?: string;
}

export type AddNoteApiResponse = string;

export interface GetNoteInfoApiRequest {
  resourceId: string;
}

export type GetNoteInfoApiResponse = NoteInfoResponse;

export interface GetDrawIoLatestSnapshotApiRequest {
  resourceId: string;
}

export interface GetDrawIoLatestSnapshotApiResponse {
  resourceId: string;
  version: number;
  fullSnapshot?: string | null;
  deltas?: string[] | null;
}

export interface SaveDrawIoSnapshotApiRequest {
  resourceId: string;
  version: number;
  data: string;
  plainText?: string;
}

export interface ForkNoteApiRequest {
  resourceId: string;
  forkedResourceVersion?: number;
  forkedResourceName?: string;
}

export interface ListNoteVersionsApiRequest {
  resourceId: string;
  page?: number;
  size?: number;
}
