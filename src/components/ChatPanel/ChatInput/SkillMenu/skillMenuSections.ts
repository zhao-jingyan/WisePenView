import type { SkillScopeTreeGroup } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatInputSelectedSkill, ChatInputSelectedTool } from '../index.type';

export type SkillMenuItemKind = 'primary-skill' | 'external-skill' | 'tool';

export interface SkillMenuItem {
  key: string;
  kind: SkillMenuItemKind;
  label: string;
  checked?: boolean;
  sourceText?: string;
  skill?: SkillSummary;
  tool?: ChatInputSelectedTool;
}

export interface SkillMenuSection {
  key: string;
  items: SkillMenuItem[];
}

interface BuildSkillMenuSectionsInput {
  primarySkills: SkillSummary[];
  selectedSkills: ChatInputSelectedSkill[];
  selectedTools: ChatInputSelectedTool[];
  toolOptions: ChatInputSelectedTool[];
  otherSkillGroups: SkillScopeTreeGroup[];
}

const mapPrimarySkillToMenuItem =
  (selectedSkillIdSet: Set<string>) =>
  (skill: SkillSummary): SkillMenuItem => ({
    key: skill.skillId,
    kind: 'primary-skill',
    label: skill.displayName,
    checked: selectedSkillIdSet.has(skill.skillId),
    skill,
  });

const mapToolToMenuItem =
  (selectedToolIdSet: Set<string>) =>
  (tool: ChatInputSelectedTool): SkillMenuItem => ({
    key: tool.toolId,
    kind: 'tool',
    label: tool.label,
    checked: selectedToolIdSet.has(tool.toolId),
    tool,
  });

const mapExternalSelectionToMenuItem = (item: ChatInputSelectedSkill): SkillMenuItem => {
  const sourceName = item.groupName || item.sourceAgentLabel;
  return {
    key: item.skillId,
    kind: 'external-skill',
    label: item.displayName,
    checked: true,
    sourceText: sourceName ? ` · ${sourceName}提供` : undefined,
  };
};

export function buildSkillMenuSections(input: BuildSkillMenuSectionsInput): SkillMenuSection[] {
  const { primarySkills, selectedSkills, selectedTools, toolOptions, otherSkillGroups } = input;

  const selectedSkillIdSet = new Set(selectedSkills.map((skill) => skill.skillId));
  const selectedToolIdSet = new Set(selectedTools.map((tool) => tool.toolId));

  const sections: SkillMenuSection[] = [];

  if (primarySkills.length > 0) {
    sections.push({
      key: 'primary-skills',
      items: primarySkills.map(mapPrimarySkillToMenuItem(selectedSkillIdSet)),
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
      items: externalSelections.map(mapExternalSelectionToMenuItem),
    });
  }

  if (toolOptions.length > 0) {
    sections.push({
      key: 'tools',
      items: toolOptions.map(mapToolToMenuItem(selectedToolIdSet)),
    });
  }

  return sections;
}
