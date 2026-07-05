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
import type { ChatUploadedAttachmentContext } from '../session/index.type';

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

const inferProviderKey = (values: Array<string | null | undefined>): string => {
  let haystack = '';
  for (const value of values) {
    if (!value) continue;
    haystack = `${haystack} ${value}`;
  }
  haystack = haystack.toLowerCase();

  for (const item of PROVIDER_KEY_HINTS) {
    for (const pattern of item.patterns) {
      if (haystack.includes(pattern)) return item.key;
    }
  }
  return 'openai';
};

const normalizeProviderOption = (
  mapping: ModelProviderMappingResponse,
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => ({
  providerId: mapping.provider_id,
  providerName: mapping.provider_name,
  providerModelName: mapping.provider_model_name,
  provider: inferProviderKey([
    mapping.provider_name,
    mapping.provider_model_name,
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name,
  ]),
  supportRuntimeOptions: mapping.support_runtime_options ?? {},
  isPreferred: mapping.is_preferred,
  isActive: mapping.is_active,
  priority: mapping.priority,
});

const getOrderedProviderOptions = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption[] => {
  const options = (model.mappings ?? [])
    .filter((mapping) => mapping.is_active)
    .map((mapping) => normalizeProviderOption(mapping, model));

  // provider 选择器优先展示推荐项，其次按后端优先级和 provider model 名稳定排序。
  return options.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return a.priority - b.priority || a.providerModelName.localeCompare(b.providerModelName);
  });
};

const buildSelectionId = (modelId: string, providerId?: string): string =>
  providerId ? `${modelId}:${providerId}` : modelId;

const buildModelTags = (
  model: ListModelsApiResponse['system_models'][number],
  providerOption: ChatModelProviderOption | undefined,
  index: number
): ChatModel['tags'] => {
  const tags: ChatModel['tags'] = [];
  if (model.is_active && index === 0) {
    tags.push({ text: 'Default', type: 'blue' });
  }
  if (model.support_thinking) {
    tags.push({ text: 'Thinking', type: 'purple' });
  }
  if (model.support_vision) {
    tags.push({ text: 'Vision', type: 'green' });
  }
  if (providerOption?.isPreferred) {
    tags.push({ text: 'Preferred', type: 'blue' });
  }
  return tags;
};

const createFallbackProviderOption = (
  model: ListModelsApiResponse['system_models'][number]
): ChatModelProviderOption => {
  const provider = inferProviderKey([
    MODEL_FAMILY_PROVIDER_MAP[model.model_family],
    model.display_name,
  ]);
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
    inferProviderKey([MODEL_FAMILY_PROVIDER_MAP[model.model_family], model.display_name]),
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
  const modelOptions: ChatModel[] = [];

  const appendModelOptions = (model: ListModelsApiResponse['system_models'][number]): void => {
    if (!model.is_active) return;
    const providerOptions = getOrderedProviderOptions(model);
    const options =
      providerOptions.length > 0 ? providerOptions : [createFallbackProviderOption(model)];

    for (const providerOption of options) {
      const effectiveProviderOptions = providerOptions.length > 0 ? providerOptions : [];
      modelOptions.push(
        mapModelOption(model, effectiveProviderOptions, providerOption, modelOptions.length)
      );
    }
  };

  for (const model of data.system_models) {
    appendModelOptions(model);
  }
  for (const model of data.user_models) {
    appendModelOptions(model);
  }

  return modelOptions;
};

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
  mapUploadAttachmentResultToContext,
};
