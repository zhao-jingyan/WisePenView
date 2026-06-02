import { useNewNoteStore, useNoteSelectionStore, usePdfPreviewProgressStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { NoteApi } from '../apis/NoteApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import { NoteServicesMap } from '../mapper/NoteServices.map';
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
  const payload = NoteServicesMap.mapSyncTitleRequest(params);
  await ResourceItemApi.renameResource(payload);
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(params);
  return NoteServicesMap.mapCreateNoteFromApi(resourceId);
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  await ResourceItemApi.removeResources({ resourceIds: params.resourceIds });
  for (const resourceId of params.resourceIds) {
    // 资源已删除，同步清理与之绑定的临时状态
    usePdfPreviewProgressStore.getState().removeProgress(resourceId);
    useNewNoteStore.getState().clearNewNoteResourceId(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo || !noteInfoData?.noteInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNoteInfoDisplayFromApi(noteInfoData);
};

export const createNoteServices = (): INoteService => ({
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
});
