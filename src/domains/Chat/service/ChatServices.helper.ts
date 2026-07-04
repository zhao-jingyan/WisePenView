import type { DriveNode } from '@/domains/Drive';
import type { Group } from '@/domains/Group';
import type { ResourceItem, SkillSummary } from '@/domains/Resource';
import { buildAgentFromResourceItem, buildDefaultPersonalAgent } from '../mapper/agent.mapper';
import { mapDriveNodeToDocumentPickerNode } from '../mapper/documentPicker.mapper';
import {
  buildAdvancedSkillTreeGroups,
  getPrimarySkillsForAgent,
} from '../mapper/skillScope.mapper';
import { mapResourceItemToSkillSummary } from '../mapper/workspace.mapper';
import type {
  ChatDocumentPickerNode,
  ChatInputCapabilityOptions,
  ChatWorkspace,
  GetChatInputCapabilityOptionsParams,
  ToolOption,
} from './index.type';

export interface GroupResourceBatch {
  group: Group;
  list: ResourceItem[];
}

export const mergeUniqueGroups = (joinedGroups: Group[], managedGroups: Group[]): Group[] => {
  const groups: Group[] = [];
  const seenGroupIds = new Set<string>();

  for (const group of joinedGroups) {
    if (seenGroupIds.has(group.groupId)) continue;
    seenGroupIds.add(group.groupId);
    groups.push(group);
  }

  for (const group of managedGroups) {
    if (seenGroupIds.has(group.groupId)) continue;
    seenGroupIds.add(group.groupId);
    groups.push(group);
  }

  return groups;
};

export const buildGroupResourceBatch = (group: Group, list: ResourceItem[]): GroupResourceBatch => {
  return { group, list };
};

export const buildWorkspaceSkills = (
  personalItems: ResourceItem[],
  groupBatches: GroupResourceBatch[]
): SkillSummary[] => {
  const skills: SkillSummary[] = [];

  for (const item of personalItems) {
    skills.push(mapResourceItemToSkillSummary(item));
  }

  for (const batch of groupBatches) {
    for (const item of batch.list) {
      skills.push(
        mapResourceItemToSkillSummary(item, {
          groupId: batch.group.groupId,
          groupName: batch.group.groupName,
        })
      );
    }
  }

  return skills;
};

export const buildWorkspaceAgents = (
  personalItems: ResourceItem[],
  groupBatches: GroupResourceBatch[]
): Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'> => {
  const personalAgents: ChatWorkspace['personalAgents'] = [];
  const groupAgents: ChatWorkspace['groupAgents'] = [];

  for (const item of personalItems) {
    personalAgents.push(buildAgentFromResourceItem(item));
  }

  for (const batch of groupBatches) {
    for (const item of batch.list) {
      groupAgents.push(
        buildAgentFromResourceItem(item, {
          groupId: batch.group.groupId,
          groupName: batch.group.groupName,
        })
      );
    }
  }

  return { personalAgents, groupAgents };
};

export const buildChatInputAgents = (
  workspace: Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'>
): ChatWorkspace['personalAgents'] => {
  const agents: ChatWorkspace['personalAgents'] = [buildDefaultPersonalAgent()];
  for (const agent of workspace.personalAgents) {
    agents.push(agent);
  }
  for (const agent of workspace.groupAgents) {
    agents.push(agent);
  }
  return agents;
};

export const buildCapabilityOptions = (
  workspace: ChatWorkspace,
  tools: ToolOption[],
  params: GetChatInputCapabilityOptionsParams
): ChatInputCapabilityOptions => {
  const primarySkills = getPrimarySkillsForAgent(workspace.skills, params.agent);
  const primaryIds = new Set<string>();
  for (const skill of primarySkills) {
    primaryIds.add(skill.skillId);
  }
  const allOtherSkillGroups = buildAdvancedSkillTreeGroups(
    workspace.skills,
    workspace.groups,
    params.agent,
    primarySkills
  );
  const otherSkillGroups: ChatInputCapabilityOptions['otherSkillGroups'] = [];

  for (const group of allOtherSkillGroups) {
    const skills: SkillSummary[] = [];
    for (const skill of group.skills) {
      if (primaryIds.has(skill.skillId)) continue;
      skills.push(skill);
    }
    if (skills.length === 0) continue;
    otherSkillGroups.push({
      key: group.key,
      label: group.label,
      skills,
    });
  }

  return {
    primarySkills,
    otherSkillGroups,
    tools,
  };
};

export const buildDocumentPickerNodes = (children: DriveNode[]): ChatDocumentPickerNode[] => {
  const nodes: ChatDocumentPickerNode[] = [];
  for (const child of children) {
    const node = mapDriveNodeToDocumentPickerNode(child);
    if (!node) continue;
    nodes.push(node);
  }
  return nodes;
};
