import type { Model } from '@/components/ChatPanel/index.type';

/** ChatService 接口：当前仅提供模型列表能力（后续再接真实 API） */
export interface IChatService {
  getModels(): Promise<Model[]>;
}
