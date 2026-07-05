import type {
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
  UploadAttachmentResponse,
} from '../apis/ChatApi.type';
import type {
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  RenameSessionRequest,
  UploadAttachmentResult,
} from '../service/index.type';
import type { ChatUploadedAttachmentContext } from '../session/index.type';

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;

  const request: CreateSessionApiRequest = {};
  if (hasTitle) {
    request.title = title;
  }
  return request;
};

const mapCreateSessionFromApi = (data: CreateSessionApiResponse): ChatSession => data;

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  const request: RenameSessionApiRequest = {
    sessionId: params.sessionId,
  };
  if (hasNewTitle) {
    request.newTitle = newTitle;
  }
  return request;
};

const mapRenameSessionFromApi = (data: RenameSessionApiResponse): ChatSession => data;

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => {
  const request: ListSessionsApiRequest = {};
  if (params?.page !== undefined) {
    request.page = params.page;
  }
  if (params?.size !== undefined) {
    request.size = params.size;
  }
  return request;
};

const mapListSessionsFromApi = (data: ListSessionsApiResponse): PageResult<ChatSession> => {
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
): ListHistoryMessagesApiRequest => {
  const request: ListHistoryMessagesApiRequest = {
    sessionId: params.sessionId,
  };
  if (params.page !== undefined) {
    request.page = params.page;
  }
  if (params.size !== undefined) {
    request.size = params.size;
  }
  return request;
};

const mapListHistoryMessagesFromApi = (
  data: ListHistoryMessagesApiResponse
): PageResult<MessageResponse> => {
  const totalPage = data.totalPage ?? data.total_page ?? 1;
  return {
    list: data.list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage,
  };
};

const mapUploadAttachmentFromApi = (
  data: UploadAttachmentResponse,
  fallbackFilename: string
): UploadAttachmentResult => ({
  attachmentId: data.attachment_id,
  // fallback：旧附件接口可能省略 filename，此时沿用本地文件名。
  filename: data.filename ?? fallbackFilename,
});

const mapUploadAttachmentResultToContext = (
  result: UploadAttachmentResult
): ChatUploadedAttachmentContext => ({
  attachmentId: result.attachmentId,
  filename: result.filename,
  enabled: true,
});

export const ChatServicesMap = {
  mapCreateSessionRequest,
  mapCreateSessionFromApi,
  mapRenameSessionRequest,
  mapRenameSessionFromApi,
  mapListSessionsRequest,
  mapListSessionsFromApi,
  mapListHistoryMessagesRequest,
  mapListHistoryMessagesFromApi,
  mapUploadAttachmentFromApi,
  mapUploadAttachmentResultToContext,
};
