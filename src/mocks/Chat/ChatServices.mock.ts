import { MOCK_MODELS } from '@/services/mock/ChatPanel';
import { MODEL_TYPE } from '@/types/model';
import type { IChatService } from '@/services/Chat';

const providerToVendor = (provider: string): string => {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google';
    case 'grok':
      return 'xAI';
    case 'deepseek':
      return 'DeepSeek';
    case 'doubao':
      return 'Doubao';
    case 'meta':
      return 'Meta';
    case 'mistral':
      return 'Mistral';
    default:
      return 'OpenAI';
  }
};

const getModels: IChatService['getModels'] = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        standard_models: MOCK_MODELS.slice(0, 3).map((item, index) => ({
          id: index + 1,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.STANDARD_MODEL,
          ratio: 1,
          support_thinking: item.category === 'reasoning',
          support_vision: item.vision,
          is_default: index === 0,
        })),
        advanced_models: MOCK_MODELS.slice(3, 5).map((item, index) => ({
          id: 101 + index,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.ADVANCED_MODEL,
          ratio: 10,
          support_thinking: true,
          support_vision: item.vision,
          is_default: false,
        })),
        other_models: MOCK_MODELS.slice(5).map((item, index) => ({
          id: 201 + index,
          name: item.name,
          vendor: providerToVendor(item.provider),
          type: MODEL_TYPE.UNKNOWN_MODEL,
          ratio: 1,
          support_thinking: false,
          support_vision: item.vision,
          is_default: false,
        })),
      });
    }, 200);
  });
};

const createSession: IChatService['createSession'] = async (params) => {
  const now = new Date().toISOString();
  return {
    id: `mock-session-${Date.now()}`,
    user_id: 'mock-user',
    title: params?.title?.trim() ? params.title : 'New Chat',
    is_pinned: false,
    created_at: now,
    updated_at: now,
  };
};

const renameSession: IChatService['renameSession'] = async (params) => {
  const now = new Date().toISOString();
  return {
    id: params.sessionId,
    user_id: 'mock-user',
    title: params.newTitle?.trim() ? params.newTitle : 'New Chat',
    is_pinned: false,
    created_at: now,
    updated_at: now,
  };
};

const deleteSession: IChatService['deleteSession'] = async (params) => {
  void params;
};

const listHistoryMessages: IChatService['listHistoryMessages'] = async (params) => {
  return {
    list: [
      {
        id: 'msg_mock_user_001',
        role: 'user',
        content: '请用 Python 写一个快排',
        tool_calls: null,
        created_at: '2026-04-08T10:00:00Z',
      },
      {
        id: 'msg_mock_assistant_001',
        role: 'assistant',
        content: '好的，这里是快速排序的代码...',
        tool_calls: null,
        created_at: '2026-04-08T10:00:05Z',
      },
    ],
    total: 2,
    page: params.page ?? 1,
    size: params.size ?? 20,
    total_page: 1,
  };
};

export const ChatServicesMock: IChatService = {
  getModels,
  createSession,
  renameSession,
  deleteSession,
  listHistoryMessages,
};
