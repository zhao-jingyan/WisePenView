import { MOCK_MODELS } from '@/services/mock/ChatPanel';
import { MODEL_TYPE } from '@/types/model';
import type { IChatService, ModelListResponse } from './index.type';

const getModels = async (): Promise<ModelListResponse> => {
  // Chat 功能当前仍处于 mock 阶段，暂不接入真实接口
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        standard_models: MOCK_MODELS.slice(0, 3).map((item) => ({
          id: item.id,
          name: item.name,
          type: MODEL_TYPE.STANDARD_MODEL,
          providers: [],
          ratio: 1,
          is_default: item.id === 'claude-sonnet',
        })),
        advanced_models: MOCK_MODELS.slice(3, 5).map((item) => ({
          id: item.id,
          name: item.name,
          type: MODEL_TYPE.ADVANCED_MODEL,
          providers: [],
          ratio: 10,
          is_default: false,
        })),
        other_models: MOCK_MODELS.slice(5).map((item) => ({
          id: item.id,
          name: item.name,
          type: MODEL_TYPE.UNKNOWN_MODEL,
          providers: [],
          ratio: 1,
          is_default: false,
        })),
      });
    }, 500);
  });
};

export const ChatServicesImpl: IChatService = {
  getModels,
};
