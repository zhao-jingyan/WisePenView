import type { ChatAgentOption, ChatModel, ChatModelTag } from '@/domains/Chat';
import type { ResourceChatProtocolPort } from './ResourceChatProtocol';

export type ModelTag = ChatModelTag;
export type Model = ChatModel;

export interface ChatPanelProps {
  collapsed: boolean;
  fullWidth?: boolean;
  showHeader?: boolean;
  onNewChat?: () => void;
  resourceChat?: ResourceChatProtocolPort;
  agentDebug?: ChatPanelAgentDebugConfig;
  showCollapseButton?: boolean;
}

export interface ChatPanelAgentDebugConfig {
  agent: ChatAgentOption;
  isDirty: boolean;
  isSaving?: boolean;
  onSaveDraft: () => boolean | Promise<boolean>;
}
