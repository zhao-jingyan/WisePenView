import type { Group } from '@/domains/Group';
import type { ResourceItem } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';

const DEFAULT_PERSONAL_AGENT_ID = 'agent-personal-default';
const DEFAULT_PERSONAL_AGENT_LABEL = '默认Agent';

export const buildDefaultPersonalAgent = (): ChatAgentOption => ({
  agentId: DEFAULT_PERSONAL_AGENT_ID,
  agentType: 'PERSONAL',
  label: DEFAULT_PERSONAL_AGENT_LABEL,
  isDefault: true,
});

export const buildAgentFromResourceItem = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): ChatAgentOption => {
  const raw = item as ResourceItem & { defaultSkillIds?: string[] };
  const agent: ChatAgentOption = {
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

export const buildGroupAgent = (group: Group): ChatAgentOption => ({
  agentId: `agent-group-${group.groupId}`,
  agentType: 'GROUP',
  label: group.groupName,
  groupId: group.groupId,
  groupName: group.groupName,
});

export const buildAgentFromSkillTreeGroup = (
  group: { key: string; label: string },
  currentAgent: ChatAgentOption | null
): ChatAgentOption | null => {
  if (group.key === 'personal') {
    return buildDefaultPersonalAgent();
  }
  const groupId = group.key.replace(/^group-/, '');
  return {
    agentId: currentAgent?.groupId === groupId ? currentAgent.agentId : `agent-group-${groupId}`,
    agentType: 'GROUP',
    label: group.label,
    groupId,
    groupName: group.label,
  };
};

export const buildChatInputAgentOptions = (
  agents: ChatAgentOption[],
  currentAgent: ChatAgentOption
): ChatAgentOption[] => {
  if (agents.length > 0) {
    return agents;
  }
  return [currentAgent];
};

export const resolveChatInputSelectedAgent = (
  agents: ChatAgentOption[],
  currentAgent: ChatAgentOption
): ChatAgentOption => {
  for (const agent of agents) {
    if (agent.agentId === currentAgent.agentId) {
      return agent;
    }
  }
  if (agents[0]) {
    return agents[0];
  }
  return currentAgent;
};
