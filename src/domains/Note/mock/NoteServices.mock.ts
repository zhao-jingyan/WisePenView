import type {
  CreateNoteRequest,
  CreateNoteResponse,
  ForkNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '@/domains/Note';
import { useResourceDisplayNameStore } from '@/domains/Resource/store/useResourceDisplayNameStore';
import { NOTE_AI_DIFF_PREVIEW_MOCK } from './aiDiffPreview.mockdata';

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const getNoteInfoDisplay = async (_params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  return {
    noteTitle: 'AI Diff 样式预览',
    authors: [],
    lastEditedAtText: '暂无',
    version: 0,
    canCollaborativeEdit: true,
    inlineCommentEnabled: true,
    canEditInlineComment: true,
    inlineCommentAuthorsById: {},
    aiDiffPreview: NOTE_AI_DIFF_PREVIEW_MOCK,
  };
};

const getDrawIoLatestSnapshot = async () => ({
  resourceId: '123',
  version: 0,
  fullSnapshot: null,
  deltas: null,
});

const saveDrawIoSnapshot = async (_params: SaveDrawIoSnapshotRequest): Promise<void> => {
  return Promise.resolve();
};

const forkNote = async (_params: ForkNoteRequest) => {
  return { resourceId: '124' };
};

const listNoteVersions = async () => ({
  list: [],
  total: 0,
  page: 1,
  size: 20,
  totalPage: 0,
});

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  getNoteInfoDisplay,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
