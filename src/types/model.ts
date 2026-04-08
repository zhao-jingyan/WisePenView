/**
 * Chat 模型类型定义
 * 与 wisepen-chat-service 的 `chat/api/schemas/model.py` 响应字段对齐
 */

/** 供应商 ID（对齐后端 ProviderId 枚举值） */
export const MODEL_PROVIDER_ID = {
  ZHIZENGZENG: 1,
  APIYI: 2,
  MODELSCOPE: 3,
} as const;

export type ModelProviderId = (typeof MODEL_PROVIDER_ID)[keyof typeof MODEL_PROVIDER_ID];

/** 模型类型（对齐后端 ModelType 枚举值） */
export const MODEL_TYPE = {
  STANDARD_MODEL: 1,
  ADVANCED_MODEL: 2,
  UNKNOWN_MODEL: 3,
} as const;

export type ModelType = (typeof MODEL_TYPE)[keyof typeof MODEL_TYPE];

/** 对齐后端 ProviderMap */
export interface ProviderMap {
  provider_id: ModelProviderId;
  model_id: string;
}

/** 对齐后端 ModelInfo */
export interface Model {
  id: string;
  name: string;
  type: ModelType;
  providers: ProviderMap[];
  ratio: number;
  is_default: boolean;
}
