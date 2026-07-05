import type { ListModelsApiResponse, ModelProviderMappingResponse } from '../apis/ChatApi.type';
import { MODEL_TYPE } from '../enum/model';
import type { ChatModel, ChatModelProviderOption } from '../service/index.type';

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

const MODEL_TYPE_CATEGORY_MAP: Record<number, ChatModel['category']> = {
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

const normalizeModelOption = (
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
  isDefault: model.is_active && index === 0,
  vision: model.support_vision,
  usageRank: index + 1,
  contextWindowTokens: model.context_window_tokens,
  maxOutputTokens: model.max_output_tokens,
  category: MODEL_TYPE_CATEGORY_MAP[model.type] ?? 'chat',
});

export const normalizeChatModelsFromApi = (data: ListModelsApiResponse): ChatModel[] => {
  const modelOptions: ChatModel[] = [];

  const appendModelOptions = (model: ListModelsApiResponse['system_models'][number]): void => {
    if (!model.is_active) return;
    const providerOptions = getOrderedProviderOptions(model);
    const options =
      providerOptions.length > 0 ? providerOptions : [createFallbackProviderOption(model)];

    for (const providerOption of options) {
      const effectiveProviderOptions = providerOptions.length > 0 ? providerOptions : [];
      modelOptions.push(
        normalizeModelOption(model, effectiveProviderOptions, providerOption, modelOptions.length)
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
