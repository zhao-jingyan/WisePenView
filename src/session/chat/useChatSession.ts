import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';
import { baseURL } from '@/utils/Axios';

const DEFAULT_COMPLETIONS_API = `${baseURL}chat/completions`;

export interface ChatState {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface ChatRequestBody {
  session_id: string;
  query: string;
  model?: string;
  states?: ChatState[];
}

export interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
  states?: ChatState[];
  api?: string;
}

export interface SendSessionMessageOptions {
  model?: string;
  states?: ChatState[];
}

const buildRequestBody = (
  sessionId: string,
  query: string,
  model?: string,
  states?: ChatState[]
): ChatRequestBody => {
  return {
    session_id: sessionId,
    query,
    ...(model ? { model } : {}),
    ...(states && states.length > 0 ? { states } : {}),
  };
};

/**
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐 ChatRequest 所需字段（session_id/query/model/states）
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({ sessionId, model, states, api }: UseChatSessionOptions) => {
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: api ?? DEFAULT_COMPLETIONS_API,
    }),
  });

  const sendSessionMessage = useCallback(
    async (query: string, options?: SendSessionMessageOptions) => {
      const requestBody = buildRequestBody(
        sessionId,
        query,
        options?.model ?? model,
        options?.states ?? states
      );
      await chat.sendMessage({ text: query }, { body: requestBody });
    },
    [chat, model, sessionId, states]
  );

  return {
    ...chat,
    sendSessionMessage,
  };
};
