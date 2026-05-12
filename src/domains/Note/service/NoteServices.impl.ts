import type { NoteInfoResponse } from '@/domains/Note';
import { useNoteSelectionStore, useRecentFilesStore } from '@/store';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { NoteApi } from '../apis/NoteApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SyncTitleRequest,
} from './index.type';

// syncTitle是一个resource的工作，但是语义上属于note服务
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  const { resourceId, newName } = params;
  await ResourceItemApi.renameResource({
    resourceId,
    newName,
  });
  useRecentFilesStore.getState().updateFileName(resourceId, newName);
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(params);
  return {
    resourceId: resourceId || undefined,
  };
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  await ResourceItemApi.removeResources({ resourceIds: params.resourceIds });
  for (const resourceId of params.resourceIds) {
    useRecentFilesStore.getState().removeFile(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = (await NoteApi.getNoteInfo(params)) as NoteInfoResponse;
  if (!noteInfoData?.resourceInfo || !noteInfoData?.noteInfo) {
    throw new Error('笔记不存在或已被删除');
  }
  const authorIds = noteInfoData.noteInfo.authors ?? [];
  return {
    noteTitle: noteInfoData.resourceInfo.resourceName,
    authors: authorIds.map((authorId) => {
      const author = noteInfoData.authorsDisplay?.[authorId];
      return {
        name: author?.nickname || author?.realName || '未知用户',
        avatar: author?.avatar,
      };
    }),
    lastEditedAtText: formatTimestampToDateTime(noteInfoData.noteInfo.lastUpdatedAt) || '暂无',
  };
};

export const createNoteServices = (): INoteService => ({
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
});
