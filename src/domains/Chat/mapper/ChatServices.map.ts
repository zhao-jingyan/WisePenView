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
import { MODEL_TYPE } from '../enum/model';
import type {
  ChatModel,
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  RenameSessionRequest,
} from '../service/index.type';

const VENDOR_PROVIDER_MAP: Record<string, string> = {
  openai: 'openai',
  google: 'google',
  anthropic: 'anthropic',
  xai: 'grok',
  deepseek: 'deepseek',
  doubao: 'doubao',
  meta: 'meta',
  mistral: 'mistral',
};

const inferProvider = (vendor: string): string => {
  const normalizedVendor = String(vendor ?? '')
    .trim()
    .toLowerCase();
  return VENDOR_PROVIDER_MAP[normalizedVendor] ?? 'openai';
};

const mapGetModelsFromApi = (data: ListModelsApiResponse): ChatModel[] => {
  const groupedModels = [...data.system_models, ...data.user_models];
  return groupedModels.map((item, index) => ({
    id: String(item.id),
    name: item.display_name,
    vendor: item.vendor,
    provider: inferProvider(item.vendor),
    ratio: item.billing_ratio,
    supportThinking: item.support_thinking,
    tags: [
      ...(item.is_active && index === 0 ? [{ text: 'Default', type: 'blue' }] : []),
      ...(item.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
    ],
    multiplier: item.billing_ratio >= 1 ? `${item.billing_ratio}x 消耗` : null,
    isDefault: item.is_active && index === 0,
    vision: item.support_vision,
    usageRank: index + 1,
    category:
      item.type === MODEL_TYPE.ADVANCED_MODEL
        ? 'reasoning'
        : item.type === MODEL_TYPE.STANDARD_MODEL
          ? 'all-round'
          : 'chat',
  }));
};

const mapCreateSessionRequest = (params?: CreateSessionRequest): CreateSessionApiRequest => {
  const title = params?.title;
  const hasTitle = title !== undefined;

  return {
    ...(hasTitle ? { title } : {}),
  };
};

const mapCreateSessionFromApi = (data: CreateSessionApiResponse): ChatSession => data;

const mapRenameSessionRequest = (params: RenameSessionRequest): RenameSessionApiRequest => {
  const newTitle = params.newTitle;
  const hasNewTitle = newTitle !== undefined;

  return {
    sessionId: params.sessionId,
    ...(hasNewTitle ? { newTitle } : {}),
  };
};

const mapRenameSessionFromApi = (data: RenameSessionApiResponse): ChatSession => data;

const mapListSessionsRequest = (params?: ListSessionsRequest): ListSessionsApiRequest => ({
  ...(params?.page !== undefined ? { page: params.page } : {}),
  ...(params?.size !== undefined ? { size: params.size } : {}),
});

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
): ListHistoryMessagesApiRequest => ({
  sessionId: params.sessionId,
  ...(params.page !== undefined ? { page: params.page } : {}),
  ...(params.size !== undefined ? { size: params.size } : {}),
});

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
