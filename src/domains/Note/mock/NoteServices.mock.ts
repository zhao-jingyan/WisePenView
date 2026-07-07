import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  ForkNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '@/domains/Note';
import { useResourceDisplayNameStore } from '@/store';

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const deleteNote = async (_params: DeleteNoteRequest): Promise<void> => {
  return Promise.resolve();
};

const getNoteInfoDisplay = async (_params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  return {
    noteTitle: '未命名笔记',
    authors: [],
    lastEditedAtText: '暂无',
    version: 0,
    canCollaborativeEdit: true,
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
  deleteNote,
  getNoteInfoDisplay,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
