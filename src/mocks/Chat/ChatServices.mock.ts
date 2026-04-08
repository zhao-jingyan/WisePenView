import { MOCK_MODELS } from '@/services/mock/ChatPanel';
import type { Model } from '@/components/ChatPanel/index.type';
import type { IChatService } from '@/services/Chat';

const getModels = async (): Promise<Model[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_MODELS);
    }, 200);
  });
};

export const ChatServicesMock: IChatService = {
  getModels,
};
