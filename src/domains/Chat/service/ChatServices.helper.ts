import type { Group } from '@/domains/Group';
import type { ResourceItem, SkillSummary } from '@/domains/Resource';
import { mapResourceItemToSkillSummary } from '../mapper/workspace.mapper';
import type { ChatWorkspace } from './index.type';

type ChatAgent = ChatWorkspace['personalAgents'][number];

const buildAgentFromResourceItem = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): ChatAgent => {
  const raw = item as ResourceItem & { defaultSkillIds?: string[] };
  const agent: ChatAgent = {
    agentId: `agent-${item.resourceId}`,
    agentType: 'PERSONAL',
    label: item.resourceName,
    defaultSkillIds: raw.defaultSkillIds,
  };
  if (group) {
    agent.agentType = 'GROUP';
    agent.groupId = group.groupId;
    agent.groupName = group.groupName;
  }
  return agent;
};

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
