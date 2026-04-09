export interface ModelTag {
  text: string;
  type: string;
}

export interface Model {
  id: string;
  name: string;
  vendor: string;
  provider: string; // 'openai' | 'anthropic' | ...
  ratio: number;
  supportThinking: boolean;
  tags: ModelTag[];
  multiplier: string | null;
  isDefault: boolean;
  vision: boolean;
  usageRank: number;
  category: 'reasoning' | 'chat' | 'coding' | 'all-round';
}

export type MessageRole = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // 正文内容

  reasoningContent?: string;

  createAt: number;
  loading?: boolean;
  error?: boolean;

  meta?: {
    provider?: string;
    modelId?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTime?: number;
    };
  };
}
