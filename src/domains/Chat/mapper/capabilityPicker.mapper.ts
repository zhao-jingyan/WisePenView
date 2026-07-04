import type { SkillScopeTreeGroup } from '@/domains/Chat/mapper/skillScope.mapper';
import type { SkillSummary } from '@/domains/Resource';

export interface CapabilityToolOption {
  toolId: string;
  label: string;
}

export type CapabilityPickerItemKind = 'primary-skill' | 'external-skill' | 'tool';

export interface CapabilityPickerItem {
  key: string;
  kind: CapabilityPickerItemKind;
  label: string;
  checked?: boolean;
  sourceText?: string;
  skill?: SkillSummary;
  tool?: CapabilityToolOption;
}

export interface CapabilityPickerSection {
  key: string;
  items: CapabilityPickerItem[];
}

export interface CapabilitySkillSelection {
  skillId: string;
  displayName: string;
  currentVersionId?: string;
  scopeType?: 'PERSONAL' | 'GROUP';
  groupId?: string;
  groupName?: string;
  sourceAgentId?: string;
  sourceAgentLabel?: string;
  external?: boolean;
}

interface BuildCapabilityPickerSectionsInput {
  primarySkills: SkillSummary[];
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  toolOptions: CapabilityToolOption[];
  otherSkillGroups: SkillScopeTreeGroup[];
}

const mapPrimarySkillToPickerItem =
  (selectedSkillIdSet: Set<string>) =>
  (skill: SkillSummary): CapabilityPickerItem => ({
    key: skill.skillId,
    kind: 'primary-skill',
    label: skill.displayName,
    checked: selectedSkillIdSet.has(skill.skillId),
    skill,
  });

const mapToolToPickerItem =
  (selectedToolIdSet: Set<string>) =>
  (tool: CapabilityToolOption): CapabilityPickerItem => ({
    key: tool.toolId,
    kind: 'tool',
    label: tool.label,
    checked: selectedToolIdSet.has(tool.toolId),
    tool,
  });

const mapExternalSelectionToPickerItem = (item: CapabilitySkillSelection): CapabilityPickerItem => {
  const sourceName = item.groupName || item.sourceAgentLabel;
  return {
    key: item.skillId,
    kind: 'external-skill',
    label: item.displayName,
    checked: true,
    sourceText: sourceName ? ` · ${sourceName}提供` : undefined,
  };
};

export function buildCapabilityPickerSections(
  input: BuildCapabilityPickerSectionsInput
): CapabilityPickerSection[] {
  const { primarySkills, selectedSkills, selectedTools, toolOptions, otherSkillGroups } = input;

  const selectedSkillIdSet = new Set(selectedSkills.map((skill) => skill.skillId));
  const selectedToolIdSet = new Set(selectedTools.map((tool) => tool.toolId));

  const sections: CapabilityPickerSection[] = [];

  if (primarySkills.length > 0) {
    sections.push({
      key: 'primary-skills',
      items: primarySkills.map(mapPrimarySkillToPickerItem(selectedSkillIdSet)),
    });
  }

  const externalSelections = selectedSkills.filter((item) => item.external);
  if (externalSelections.length > 0) {
    const orderMap = new Map(otherSkillGroups.map((group, index) => [group.key, index]));
    // 已选的其他 Skill 按弹窗树顺序展示，避免确认后菜单顺序跳变。
    externalSelections.sort((a, b) => {
      const aKey = a.groupId ? `group-${a.groupId}` : 'personal';
      const bKey = b.groupId ? `group-${b.groupId}` : 'personal';
      return (
        (orderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER)
      );
    });

    sections.push({
      key: 'external-skills',
      items: externalSelections.map(mapExternalSelectionToPickerItem),
    });
  }

  if (toolOptions.length > 0) {
    sections.push({
      key: 'tools',
      items: toolOptions.map(mapToolToPickerItem(selectedToolIdSet)),
    });
  }

  return sections;
}
