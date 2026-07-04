import type {
  CreateSessionApiRequest,
  CreateSessionApiResponse,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
  ListModelsApiResponse,
  ListSessionsApiRequest,
  ListSessionsApiResponse,
  ModelProviderMappingResponse,
  RenameSessionApiRequest,
  RenameSessionApiResponse,
  UploadAttachmentResponse,
} from '../apis/ChatApi.type';
import { MODEL_TYPE } from '../enum/model';
import type {
  ChatModel,
  ChatModelProviderOption,
  ChatSession,
  CreateSessionRequest,
  ListHistoryMessagesRequest,
  ListSessionsRequest,
  MessageResponse,
  PageResult,
  RenameSessionRequest,
  UploadAttachmentResult,
} from '../service/index.type';

const PROVIDER_KEY_HINTS: Array<{ key: string; patterns: string[] }> = [
  { key: 'anthropic', patterns: ['anthropic', 'claude'] },
  { key: 'google', patterns: ['google', 'gemini'] },
  { key: 'grok', patterns: ['grok', 'xai', 'x.ai'] },
  { key: 'deepseek', patterns: ['deepseek'] },
  { key: 'doubao', patterns: ['doubao', 'bytedance'] },
  { key: 'meta', patterns: ['meta', 'llama'] },
  { key: 'mistral', patterns: ['mistral'] },
  { key: 'openai', patterns: ['openai', 'gpt', 'o1', 'o3', 'o4'] },
  { key: 'qwen', patterns: ['qwen', 'tongyi', 'dashscope', 'alibaba'] },
];

const MODEL_FAMILY_PROVIDER_MAP: Record<string, string> = {
  CLAUDE: 'anthropic',
  GEMINI: 'google',
  GPT: 'openai',
  QWEN: 'qwen',
};

const MODEL_TYPE_LABEL_MAP: Record<number, ChatModel['category']> = {
  [MODEL_TYPE.ADVANCED_MODEL]: 'reasoning',
  [MODEL_TYPE.STANDARD_MODEL]: 'all-round',
  [MODEL_TYPE.CUSTOM_MODEL]: 'chat',
  [MODEL_TYPE.UNKNOWN_MODEL]: 'chat',
};

const inferProviderKey = (...values: Array<string | null | undefined>): string => {
  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  const matched = PROVIDER_KEY_HINTS.find((item) =>
    item.patterns.some((pattern) => haystack.includes(pattern))
  );
  return matched?.key ?? 'openai';
};

const normalizeProviderOption = (
  mapping: ModelProviderMappingResponse,
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => ({
  providerId: mapping.provider_id,
  providerName: mapping.provider_name,
  providerModelName: mapping.provider_model_name,
  provider: inferProviderKey(
    mapping.provider_name,
    mapping.provider_model_name,
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  ),
  supportRuntimeOptions: mapping.support_runtime_options ?? {},
  isPreferred: mapping.is_preferred,
  isActive: mapping.is_active,
  priority: mapping.priority,
});

const getOrderedProviderOptions = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption[] =>
  (model.mappings ?? [])
    .filter((mapping) => mapping.is_active)
    .map((mapping) => normalizeProviderOption(mapping, model))
    .sort((a, b) => {
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return a.priority - b.priority || a.providerModelName.localeCompare(b.providerModelName);
    });

const buildSelectionId = (modelId: string, providerId?: string): string =>
  providerId ? `${modelId}:${providerId}` : modelId;

const buildModelTags = (
  model: ListModelsApiResponse['system_models'][number],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel['tags'] => [
  ...(model.is_active && index === 0 ? [{ text: 'Default', type: 'blue' }] : []),
  ...(model.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
  ...(model.support_vision ? [{ text: 'Vision', type: 'green' }] : []),
  ...(providerOption?.isPreferred ? [{ text: 'Preferred', type: 'blue' }] : []),
];

const createFallbackProviderOption = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => {
  const provider = inferProviderKey(
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name
  );
  return {
    providerId: '',
    providerName: null,
    providerModelName: model.display_name,
    provider,
    supportRuntimeOptions: {},
    isPreferred: false,
    isActive: true,
    priority: 0,
  };
};

const mapModelOption = (
  model: ListModelsApiResponse['system_models'][number],
  providerOptions: ChatModelProviderOption[],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel => ({
  id: buildSelectionId(model.id, providerOption?.providerId || undefined),
  modelId: model.id,
  name: model.display_name,
  provider:
    providerOption?.provider ??
    inferProviderKey(MODEL_FAMILY_PROVIDER_MAP[model.model_family], model.display_name),
  providerId: providerOption?.providerId || undefined,
  providerName: providerOption?.providerName,
  providerModelName: providerOption?.providerModelName,
  providerOptions,
  scope: model.scope,
  modelFamily: model.model_family,
  ratio: model.billing_ratio,
  supportThinking: model.support_thinking,
  supportTools: model.support_tools,
  tags: buildModelTags(model, providerOption, index),
  multiplier: model.billing_ratio >= 1 ? `${model.billing_ratio}x 消耗` : null,
  isDefault: model.is_active && index === 0,
  vision: model.support_vision,
  usageRank: index + 1,
  contextWindowTokens: model.context_window_tokens,
  maxOutputTokens: model.max_output_tokens,
  category: MODEL_TYPE_LABEL_MAP[model.type] ?? 'chat',
});

const mapGetModelsFromApi = (data: ListModelsApiResponse): ChatModel[] => {
  const groupedModels = [...data.system_models, ...data.user_models].filter(
    (item) => item.is_active
  );
  const modelOptions: ChatModel[] = [];

  groupedModels.forEach((model) => {
    const providerOptions = getOrderedProviderOptions(model);
    const options =
      providerOptions.length > 0 ? providerOptions : [createFallbackProviderOption(model)];

    options.forEach((providerOption) => {
      const effectiveProviderOptions = providerOptions.length > 0 ? providerOptions : [];
      modelOptions.push(
        mapModelOption(model, effectiveProviderOptions, providerOption, modelOptions.length)
      );
    });
  });

  return modelOptions;
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

const mapUploadAttachmentFromApi = (
  data: UploadAttachmentResponse,
  fallbackFilename: string
): UploadAttachmentResult => ({
  attachmentId: data.attachment_id,
  // fallback：旧附件接口可能省略 filename，此时沿用本地文件名。
  filename: data.filename ?? fallbackFilename,
});

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
  mapUploadAttachmentFromApi,
};
