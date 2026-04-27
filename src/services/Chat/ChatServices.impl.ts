import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { useCurrentChatSessionStore, useNewChatSessionStore, useNoteSelectionStore } from '@/store';
import type {
  ChatSession,
  CreateSessionRequest,
  DeleteSessionRequest,
  IChatService,
  ListSessionsRequest,
  ListHistoryMessagesRequest,
  MessageResponse,
  ModelListResponse,
  PageResult,
  RenameSessionRequest,
} from './index.type';

const getModels = async (): Promise<ModelListResponse> => {
  const res = (await Axios.get('/chat/model/listModels')) as ApiResponse<ModelListResponse>;
  checkResponse(res);

  return {
    standard_models: res.data?.standard_models ?? [],
    advanced_models: res.data?.advanced_models ?? [],
    other_models: res.data?.other_models ?? [],
  };
};

const createSession = async (params?: CreateSessionRequest): Promise<ChatSession> => {
  const payload: { title?: string } = {};
  if (params?.title !== undefined) {
    payload.title = params.title;
  }

  const res = (await Axios.post(
    '/chat/session/createSession',
    payload
  )) as ApiResponse<ChatSession>;
  checkResponse(res);

  if (!res.data) {
    throw new Error('创建会话失败');
  }
  return res.data;
};

const renameSession = async (params: RenameSessionRequest): Promise<ChatSession> => {
  const payload: { new_title?: string } = {};
  if (params.newTitle !== undefined) {
    payload.new_title = params.newTitle;
  }

  const res = (await Axios.post('/chat/session/renameSession', payload, {
    params: { session_id: params.sessionId },
  })) as ApiResponse<ChatSession>;
  checkResponse(res);

  if (!res.data) {
    throw new Error('重命名会话失败');
  }
  return res.data;
};

const deleteSession = async (params: DeleteSessionRequest): Promise<void> => {
  const res = (await Axios.post('/chat/session/deleteSession', undefined, {
    params: { session_id: params.sessionId },
  })) as ApiResponse<null>;
  checkResponse(res);
  useCurrentChatSessionStore.getState().clearCurrentSessionById(params.sessionId);
  useNewChatSessionStore.getState().clearNewChatSessionById(params.sessionId);
  useNoteSelectionStore.getState().clearSelectedText(params.sessionId);
};

const listSessions = async (params?: ListSessionsRequest): Promise<PageResult<ChatSession>> => {
  const res = (await Axios.get('/chat/session/listSessions', {
    params: {
      page: params?.page,
      size: params?.size,
    },
  })) as ApiResponse<PageResult<ChatSession>>;
  checkResponse(res);

  const payload = res.data;
  return {
    list: payload?.list ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? params?.page ?? 1,
    size: payload?.size ?? params?.size ?? 20,
    total_page: payload?.total_page ?? 0,
  };
};

const listHistoryMessages = async (
  params: ListHistoryMessagesRequest
): Promise<PageResult<MessageResponse>> => {
  const res = (await Axios.get('/chat/session/listHistoryMessages', {
    params: {
      session_id: params.sessionId,
      page: params.page,
      size: params.size,
    },
  })) as ApiResponse<PageResult<MessageResponse>>;
  checkResponse(res);

  const payload = res.data;
  return {
    list: payload?.list ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? params.page ?? 1,
    size: payload?.size ?? params.size ?? 20,
    total_page: payload?.total_page ?? 0,
  };
};

export const createChatServices = (): IChatService => ({
  getModels,
  createSession,
  renameSession,
  deleteSession,
  listSessions,
  listHistoryMessages,
});
