import type { Group } from '@/domains/Group';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { buildAgentFromSkillTreeGroup } from './agent.mapper';

export interface SkillScopeTreeGroup {
  key: string;
  label: string;
  skills: SkillSummary[];
}

export interface OtherSkillTreeGroup extends SkillScopeTreeGroup {
  sourceAgent: ChatAgentOption | null;
}

export const getSkillScopeLabel = (skill: SkillSummary): string => {
  if (skill.scopeType === 'GROUP') {
    return skill.groupName || '小组';
  }
  return '个人';
};

const getSkillTreeGroupKey = (agent: ChatAgentOption | null | undefined): string => {
  if (!agent || agent.agentType === 'PERSONAL') return 'personal';
  return `group-${agent.groupId ?? agent.agentId}`;
};

const getSkillTreeGroupLabel = (agent: ChatAgentOption | null | undefined): string => {
  if (!agent || agent.agentType === 'PERSONAL') return '个人';
  return agent.groupName || agent.label || '小组';
};

const buildCurrentAgentSkillTreeGroup = (
  agent: ChatAgentOption | null | undefined,
  skills: SkillSummary[]
): SkillScopeTreeGroup => ({
  key: getSkillTreeGroupKey(agent),
  label: getSkillTreeGroupLabel(agent),
  skills,
});

const isSkillInAgentScope = (
  skill: SkillSummary,
  agent: ChatAgentOption | null | undefined
): boolean => {
  // Agent 有明确 Skill 列表时，按 skillId 精确匹配
  if (agent?.defaultSkillIds && agent.defaultSkillIds.length > 0) {
    return agent.defaultSkillIds.includes(skill.skillId);
  }
  if (!agent || agent.agentType === 'PERSONAL') {
    return skill.scopeType !== 'GROUP';
  }
  return skill.scopeType === 'GROUP' && skill.groupId === agent.groupId;
};

export const getPrimarySkillsForAgent = (
  skills: SkillSummary[],
  agent: ChatAgentOption | null | undefined
): SkillSummary[] => {
  const primarySkills: SkillSummary[] = [];
  for (const skill of skills) {
    if (!isSkillInAgentScope(skill, agent)) continue;
    primarySkills.push(skill);
  }
  return primarySkills;
};

export const buildAdvancedSkillTreeGroups = (
  skills: SkillSummary[],
  groups: Group[],
  currentAgent?: ChatAgentOption | null,
  currentAgentSkills: SkillSummary[] = []
): SkillScopeTreeGroup[] => {
  const groupSkillMap = new Map<string, SkillSummary[]>();
  const personalSkills: SkillSummary[] = [];

  for (const skill of skills) {
    if (skill.scopeType !== 'GROUP') {
      personalSkills.push(skill);
      continue;
    }
    if (!skill.groupId) continue;
    const existing = groupSkillMap.get(skill.groupId) ?? [];
    existing.push(skill);
    groupSkillMap.set(skill.groupId, existing);
  }

  const orderedGroups: SkillScopeTreeGroup[] = [];
  const knownGroupIds = new Set<string>();
  for (const group of groups) {
    knownGroupIds.add(group.groupId);
    const groupSkills = groupSkillMap.get(group.groupId) ?? [];
    if (groupSkills.length === 0) continue;
    orderedGroups.push({
      key: `group-${group.groupId}`,
      label: group.groupName,
      skills: groupSkills,
    });
  }

  const extraGroups: SkillScopeTreeGroup[] = [];
  for (const [groupId, groupSkills] of groupSkillMap.entries()) {
    if (knownGroupIds.has(groupId)) continue;
    extraGroups.push({
      key: `group-${groupId}`,
      label: groupSkills[0]?.groupName || groupId,
      skills: groupSkills,
    });
  }

  const result: SkillScopeTreeGroup[] = [];
  for (const group of orderedGroups) {
    result.push(group);
  }
  for (const group of extraGroups) {
    result.push(group);
  }
  if (personalSkills.length > 0) {
    result.push({
      key: 'personal',
      label: '个人',
      skills: personalSkills,
    });
  }

  if (currentAgent) {
    const currentGroup = buildCurrentAgentSkillTreeGroup(currentAgent, currentAgentSkills);
    let alreadyIncluded = false;
    for (const group of result) {
      if (group.key !== currentGroup.key) continue;
      alreadyIncluded = true;
      break;
    }
    if (!alreadyIncluded) {
      if (currentGroup.key === 'personal') {
        result.push(currentGroup);
      } else {
        let personalIndex = -1;
        for (let index = 0; index < result.length; index += 1) {
          if (result[index].key !== 'personal') continue;
          personalIndex = index;
          break;
        }
        if (personalIndex === -1) {
          result.push(currentGroup);
        } else {
          result.splice(personalIndex, 0, currentGroup);
        }
      }
    }
  }

  return result;
};

export const buildOtherSkillTreeGroups = (
  groups: SkillScopeTreeGroup[],
  currentAgent: ChatAgentOption | null
): OtherSkillTreeGroup[] => {
  const result: OtherSkillTreeGroup[] = [];
  for (const group of groups) {
    result.push({
      key: group.key,
      label: group.label,
      skills: group.skills,
      sourceAgent: buildAgentFromSkillTreeGroup(group, currentAgent),
    });
  }
  return result;
};
