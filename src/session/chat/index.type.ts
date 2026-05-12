interface ChatState {
  key: string;
  value: string;
  disabled?: boolean;
}

interface ChatRequestBody {
  session_id: string;
  query: string;
  model?: string;
  states?: ChatState[];
}

interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
  enableSelected?: boolean;
}

export type { ChatRequestBody, ChatState, UseChatSessionOptions };
