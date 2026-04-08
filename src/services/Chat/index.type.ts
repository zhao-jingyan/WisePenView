import type { Model as BackendModel } from '@/types/model';

/** ChatService 接口：当前仅提供模型列表能力（后续再接真实 API） */
export interface IChatService {
  getModels(): Promise<ModelListResponse>;
}

/** `GET /chat/model/list` 的 data 字段结构 */
export interface ModelListResponse {
  standard_models: BackendModel[];
  advanced_models: BackendModel[];
  other_models: BackendModel[];
}
