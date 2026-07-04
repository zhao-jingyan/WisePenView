import type { SkillScopeTreeGroup } from '@/domains/Chat/mapper/skillScope.mapper';
import type { SkillSummary } from '@/domains/Resource';

export interface CapabilityToolOption {
  toolId: string;
  label: string;
}

export type CapabilityPickerItemKind = 'primary-skill' | 'external-skill' | 'tool' | 'select-other';

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
  advancedMode: boolean;
  otherSkillGroups: SkillScopeTreeGroup[];
}

const SELECT_OTHER_KEY = '__select-other__';

export function buildCapabilityPickerSections(
  input: BuildCapabilityPickerSectionsInput
): CapabilityPickerSection[] {
  const {
    primarySkills,
    selectedSkills,
    selectedTools,
    toolOptions,
    advancedMode,
    otherSkillGroups,
  } = input;

  const selectedSkillIdSet = new Set<string>();
  for (const skill of selectedSkills) {
    selectedSkillIdSet.add(skill.skillId);
  }
  const selectedToolIdSet = new Set<string>();
  for (const tool of selectedTools) {
    selectedToolIdSet.add(tool.toolId);
  }

  const sections: CapabilityPickerSection[] = [];

  // Primary skills
  if (primarySkills.length > 0) {
    const primaryItems: CapabilityPickerItem[] = [];
    for (const skill of primarySkills) {
      primaryItems.push({
        key: skill.skillId,
        kind: 'primary-skill',
        label: skill.displayName,
        checked: selectedSkillIdSet.has(skill.skillId),
        skill,
      });
    }

    sections.push({
      key: 'primary-skills',
      items: primaryItems,
    });
  }

  // External skills (advanced mode only)
  if (advancedMode) {
    const orderMap = new Map<string, number>();
    for (let index = 0; index < otherSkillGroups.length; index += 1) {
      const group = otherSkillGroups[index];
      orderMap.set(group.key, index);
    }

    const externalSelections: CapabilitySkillSelection[] = [];
    for (const item of selectedSkills) {
      if (!item.external) continue;
      externalSelections.push(item);
    }

    externalSelections.sort((a, b) => {
      const aKey = a.groupId ? `group-${a.groupId}` : 'personal';
      const bKey = b.groupId ? `group-${b.groupId}` : 'personal';
      return (
        (orderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER)
      );
    });

    const externalItems: CapabilityPickerItem[] = [];
    for (const item of externalSelections) {
      const sourceName = item.groupName || item.sourceAgentLabel;
      externalItems.push({
        key: item.skillId,
        kind: 'external-skill',
        label: item.displayName,
        checked: true,
        sourceText: sourceName ? ` · ${sourceName}提供` : undefined,
      });
    }

    externalItems.push({
      key: SELECT_OTHER_KEY,
      kind: 'select-other',
      label: '选择其他 Skill',
    });

    sections.push({
      key: 'external-skills',
      items: externalItems,
    });
  }

  // Tools
  if (toolOptions.length > 0) {
    const toolItems: CapabilityPickerItem[] = [];
    for (const tool of toolOptions) {
      toolItems.push({
        key: tool.toolId,
        kind: 'tool',
        label: tool.label,
        checked: selectedToolIdSet.has(tool.toolId),
        tool,
      });
    }

    sections.push({
      key: 'tools',
      items: toolItems,
    });
  }

  return sections;
}
