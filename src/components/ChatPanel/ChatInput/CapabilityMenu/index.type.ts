import type {
  CapabilityPickerSection,
  CapabilitySkillSelection,
  CapabilityToolOption,
} from '@/domains/Chat';

export interface CapabilityMenuProps {
  open: boolean;
  capabilityCount: number;
  sections: CapabilityPickerSection[];
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  onOpenChange: (open: boolean) => void;
  onToggleSkill: (skillId: string) => void;
  onToggleTool: (toolId: string) => void;
  onRemoveSkill: (skillId: string) => void;
  onSelectOther: () => void;
}
