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

  const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
  const selectedToolIdSet = new Set(selectedTools.map((t) => t.toolId));

  const sections: CapabilityPickerSection[] = [];

  // Primary skills
  if (primarySkills.length > 0) {
    sections.push({
      key: 'primary-skills',
      items: primarySkills.map((skill) => ({
        key: skill.skillId,
        kind: 'primary-skill' as const,
        label: skill.displayName,
        checked: selectedSkillIdSet.has(skill.skillId),
        skill,
      })),
    });
  }

  // External skills (advanced mode only)
  if (advancedMode) {
    const orderMap = new Map(otherSkillGroups.map((group, index) => [group.key, index]));
    const externalItems: CapabilityPickerItem[] = selectedSkills
      .filter((item) => item.external)
      .sort((a, b) => {
        const aKey = a.groupId ? `group-${a.groupId}` : 'personal';
        const bKey = b.groupId ? `group-${b.groupId}` : 'personal';
        return (
          (orderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER)
        );
      })
      .map((item) => ({
        key: item.skillId,
        kind: 'external-skill' as const,
        label: item.displayName,
        checked: true,
        sourceText:
          item.groupName || item.sourceAgentLabel
            ? ` · ${(item.groupName || item.sourceAgentLabel) ?? ''}提供`
            : undefined,
      }));

    externalItems.push({
      key: SELECT_OTHER_KEY,
      kind: 'select-other',
      label: '选择其他 Skill...',
    });

    sections.push({
      key: 'external-skills',
      items: externalItems,
    });
  }

  // Tools
  if (toolOptions.length > 0) {
    sections.push({
      key: 'tools',
      items: toolOptions.map((tool) => ({
        key: tool.toolId,
        kind: 'tool' as const,
        label: tool.label,
        checked: selectedToolIdSet.has(tool.toolId),
        tool,
      })),
    });
  }

  return sections;
}
