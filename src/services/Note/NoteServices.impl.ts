import type {
  INoteService,
  SyncTitleRequest,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  NoteInfoDisplayData,
} from './index.type';
import Axios from '@/utils/Axios';
import { formatTimestampToDateTime } from '@/utils/time';
import { serializeRepeatKeyQuery } from '@/utils/serializeRepeatKeyQuery';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { NoteInfoResponse } from '@/types/note';
import { useNoteSelectionStore, useRecentFilesStore } from '@/store';

// syncTitle是一个resource的工作，但是语义上属于note服务
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  const { resourceId, newName } = params;
  const res = (await Axios.post('/resource/item/renameResource', {
    resourceId,
    newName,
  })) as ApiResponse;
  checkResponse(res);
  useRecentFilesStore.getState().updateFileName(resourceId, newName);
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const res = (await Axios.post('/note/addNote', params)) as ApiResponse<string>;
  checkResponse(res);
  return {
    resourceId: res.data || undefined,
  };
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  const res = (await Axios.post('/resource/item/removeResources', null, {
    params: { resourceIds: params.resourceIds },
    paramsSerializer: serializeRepeatKeyQuery,
  })) as ApiResponse<void>;
  checkResponse(res);
  for (const resourceId of params.resourceIds) {
    useRecentFilesStore.getState().removeFile(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const res = (await Axios.get('/note/getNoteInfo', { params })) as ApiResponse<NoteInfoResponse>;
  checkResponse(res);
  const noteInfoData = res.data;
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
