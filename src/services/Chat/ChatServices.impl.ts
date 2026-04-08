import { MOCK_MODELS } from '@/services/mock/ChatPanel';
import type { Model } from '@/components/ChatPanel/index.type';
import type { IChatService } from './index.type';

const getModels = async (): Promise<Model[]> => {
  // Chat 功能当前仍处于 mock 阶段，暂不接入真实接口
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_MODELS);
    }, 500);
  });
};

export const ChatServicesImpl: IChatService = {
  getModels,
};
