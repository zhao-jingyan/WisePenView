import type {
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListModelsApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
} from '../apis/ChatApi.type';
import type {
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  ModelListResponse,
  PageResult,
  RenameSessionRequest,
} from '../service/index.type';

const mapGetModelsFromApi = (data: ListModelsApiResponse): ModelListResponse => ({
  standard_models: data.standard_models,
  advanced_models: data.advanced_models,
  other_models: data.other_models,
});

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;

  return {
    // 不传 title：沿用后端默认会话标题
    ...(hasTitle ? { title } : {}),
  };
};

const mapCreateSessionFromApi = (data: CreateSessionApiResponse): ChatSession => data;

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    sessionId: params.sessionId,
    // 不传 newTitle：保留后端对空标题的处理语义
    ...(hasNewTitle ? { newTitle } : {}),
  };
};

const mapRenameSessionFromApi = (data: RenameSessionApiResponse): ChatSession => data;

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => {
  // fallback：兼容旧字段 total_page 缺失极端情况
  const totalPage = data.totalPage ?? data.total_page ?? 1;
  return {
    list: data.list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage,
  };
};

const mapListHistoryMessagesRequest = (
  params: ListHistoryMessagesRequest
): ListHistoryMessagesApiRequest => ({
  sessionId: params.sessionId,
  ...(params.page !== undefined ? { page: params.page } : {}),
  ...(params.size !== undefined ? { size: params.size } : {}),
});

const mapListHistoryMessagesFromApi = (
  data: ListHistoryMessagesApiResponse
): PageResult<MessageResponse> => {
  // fallback：兼容旧字段 total_page 缺失极端情况
  const totalPage = data.totalPage ?? data.total_page ?? 1;
  return {
    list: data.list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage,
  };
};

export const ChatServicesMap = {
  mapGetModelsFromApi,
  mapCreateSessionRequest,
  mapCreateSessionFromApi,
  mapRenameSessionRequest,
  mapRenameSessionFromApi,
  mapListSessionsRequest,
  mapListSessionsFromApi,
  mapListHistoryMessagesRequest,
  mapListHistoryMessagesFromApi,
};
