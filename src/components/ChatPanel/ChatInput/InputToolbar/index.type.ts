import type { Model } from '@/components/ChatPanel/index.type';
import type {
  CapabilityPickerSection,
  CapabilitySkillSelection,
  CapabilityToolOption,
} from '@/domains/Chat';
import type { ChatAgentOption } from '@/store';

export interface InputToolbarProps {
  attachmentOpen: boolean;
  capabilityOpen: boolean;
  modelOpen: boolean;
  agentOptions: ChatAgentOption[];
  selectedAgent: ChatAgentOption;
  selectedModel: Model | null;
  models: Model[];
  modelsLoading: boolean;
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  capabilitySections: CapabilityPickerSection[];
  sendDisabled: boolean;
  onAttachmentOpenChange: (open: boolean) => void;
  onCapabilityOpenChange: (open: boolean) => void;
  onModelOpenChange: (open: boolean) => void;
  onLocalAttachPress: () => void;
  onCloudAttachPress: () => void;
  onAgentChange: (agent: ChatAgentOption) => void;
  onModelChange: (model: Model) => void;
  onToggleSkill: (skillId: string) => void;
  onToggleTool: (toolId: string) => void;
  onRemoveSkill: (skillId: string) => void;
  onSelectOtherSkill: () => void;
  onSend: () => void;
}
