import type { IResourceService } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { NoteApi } from '../apis/NoteApi';
import { NoteServicesMap } from '../mapper/NoteServices.map';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  GetNotePermissionConfigRequest,
  INoteService,
  NoteInfoDisplayData,
  NotePermissionConfig,
  SyncTitleRequest,
} from './index.type';

export interface NoteServicesDeps {
  resourceService: IResourceService;
}

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(params);
  return NoteServicesMap.mapCreateNoteFromApi(resourceId);
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo || !noteInfoData?.noteInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNoteInfoDisplayFromApi(noteInfoData);
};

const getNotePermissionConfig = async (
  params: GetNotePermissionConfigRequest
): Promise<NotePermissionConfig> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNotePermissionConfigFromApi(noteInfoData, params.resourceId);
};

export const createNoteServices = (deps: NoteServicesDeps): INoteService => {
  const { resourceService } = deps;

  // syncTitle 是 resource 的工作，但语义上属于 note 服务
  const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
    const payload = NoteServicesMap.mapSyncTitleRequest(params);
    await resourceService.renameResource(payload);
  };

  const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
    await resourceService.removeResources({ resourceIds: params.resourceIds });
  };

  return {
    syncTitle,
    createNote,
    deleteNote,
    getNoteInfoDisplay,
    getNotePermissionConfig,
  };
};
