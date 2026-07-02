import type { CapabilitySkillSelection } from '@/domains/Chat';
import type { SkillScopeTreeGroup } from '@/domains/Chat/mapper/skillScope.mapper';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';

export interface OtherSkillModalProps {
  open: boolean;
  groups: SkillScopeTreeGroup[];
  currentAgent: ChatAgentOption | null;
  selectedSkills: CapabilitySkillSelection[];
  onClose: () => void;
  onConfirm: (
    selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>
  ) => void;
}
