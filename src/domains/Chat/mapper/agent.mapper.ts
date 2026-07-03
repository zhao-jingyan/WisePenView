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
  return {
    agentId: `agent-${item.resourceId}`,
    agentType: group ? 'GROUP' : 'PERSONAL',
    label: item.resourceName,
    ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
    defaultSkillIds: raw.defaultSkillIds,
  };
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
): ChatAgentOption[] => (agents.length > 0 ? agents : [currentAgent]);

export const resolveChatInputSelectedAgent = (
  agents: ChatAgentOption[],
  currentAgent: ChatAgentOption
): ChatAgentOption =>
  agents.find((agent) => agent.agentId === currentAgent.agentId) ?? agents[0] ?? currentAgent;
