import type { ChatAgentOption } from '@/store';

export interface AgentPickerProps {
  selectedAgent: ChatAgentOption;
  agents: ChatAgentOption[];
  onChange: (agent: ChatAgentOption) => void;
}
