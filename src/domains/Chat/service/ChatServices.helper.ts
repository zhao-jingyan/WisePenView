import { buildDriveNodeScope, type DriveNode } from '@/domains/Drive';
import type { Group } from '@/domains/Group';
import type { ResourceItem, SkillSummary } from '@/domains/Resource';
import { mapResourceItemToSkillSummary } from '../mapper/workspace.mapper';
import type {
  ChatDocumentPickerNode,
  ChatDocumentPickerScope,
  ChatInputSkillMenuOptions,
  ChatWorkspace,
  GetChatInputSkillMenuOptionsParams,
  SkillScopeTreeGroup,
  ToolOption,
} from './index.type';

type ChatAgent = ChatWorkspace['personalAgents'][number];

const DEFAULT_PERSONAL_AGENT_ID = 'agent-personal-default';
const DEFAULT_PERSONAL_AGENT_LABEL = '默认Agent';

const buildDefaultPersonalAgent = (): ChatAgent => ({
  agentId: DEFAULT_PERSONAL_AGENT_ID,
  agentType: 'PERSONAL',
  label: DEFAULT_PERSONAL_AGENT_LABEL,
  isDefault: true,
});

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

const getSkillTreeGroupKey = (agent: ChatAgent | null | undefined): string => {
  if (!agent || agent.agentType === 'PERSONAL') return 'personal';
  return `group-${agent.groupId ?? agent.agentId}`;
};

const getSkillTreeGroupLabel = (agent: ChatAgent | null | undefined): string => {
  if (!agent || agent.agentType === 'PERSONAL') return '个人';
  return agent.groupName || agent.label || '小组';
};

const buildCurrentAgentSkillTreeGroup = (
  agent: ChatAgent | null | undefined,
  skills: SkillSummary[]
): SkillScopeTreeGroup => ({
  key: getSkillTreeGroupKey(agent),
  label: getSkillTreeGroupLabel(agent),
  skills,
});

const isSkillInAgentScope = (skill: SkillSummary, agent: ChatAgent | null | undefined): boolean => {
  // Agent 有明确 Skill 列表时，按 skillId 精确匹配。
  if (agent?.defaultSkillIds && agent.defaultSkillIds.length > 0) {
    return agent.defaultSkillIds.includes(skill.skillId);
  }
  if (!agent || agent.agentType === 'PERSONAL') {
    return skill.scopeType !== 'GROUP';
  }
  return skill.scopeType === 'GROUP' && skill.groupId === agent.groupId;
};

const getPrimarySkillsForAgent = (
  skills: SkillSummary[],
  agent: ChatAgent | null | undefined
): SkillSummary[] => {
  const primarySkills: SkillSummary[] = [];
  for (const skill of skills) {
    if (!isSkillInAgentScope(skill, agent)) continue;
    primarySkills.push(skill);
  }
  return primarySkills;
};

const buildAdvancedSkillTreeGroups = (
  skills: SkillSummary[],
  groups: Group[],
  currentAgent?: ChatAgent | null,
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

export const buildSkillMenuOptions = (
  workspace: ChatWorkspace,
  tools: ToolOption[],
  params: GetChatInputSkillMenuOptionsParams
): ChatInputSkillMenuOptions => {
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
  const otherSkillGroups: ChatInputSkillMenuOptions['otherSkillGroups'] = [];

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

export function buildDocumentPickerScopes(groups: Group[]): ChatDocumentPickerScope[] {
  const personalScope = buildDriveNodeScope();
  const scopes: ChatDocumentPickerScope[] = [
    {
      scopeKey: 'personal',
      label: '个人文件',
      rootId: personalScope.rootId,
      type: 'personal',
    },
  ];

  for (const group of groups) {
    const groupScope = buildDriveNodeScope(group.groupId);
    scopes.push({
      scopeKey: `group:${group.groupId}`,
      label: group.groupName,
      rootId: groupScope.rootId,
      type: 'group',
      groupId: group.groupId,
    });
  }

  return scopes;
}

function getDriveNodeTitle(node: DriveNode): string {
  switch (node.type) {
    case 'root':
      return node.name || '云盘';
    case 'folder':
      return node.name || '未命名文件夹';
    case 'resource':
    case 'link':
      return node.title || node.resourceId;
    case 'loading':
      return node.label || '';
  }
}

function mapDriveNodeToDocumentPickerNode(node: DriveNode): ChatDocumentPickerNode | null {
  if (node.type === 'loading') return null;

  const isResourceNode = node.type === 'resource' || node.type === 'link';
  const groupId = node.scope.type === 'group' ? node.scope.groupId : null;
  const base: ChatDocumentPickerNode = {
    nodeId: node.id,
    title: getDriveNodeTitle(node),
    type: node.type,
    groupId,
    resourceId: null,
    resourceName: null,
    resourceType: null,
    isLeaf: isResourceNode,
    selectable: isResourceNode,
  };

  if (isResourceNode) {
    base.resourceId = node.resourceId;
    base.resourceName = node.title || node.resourceId;
    base.resourceType = node.resourceType ?? '';
  }
  return base;
}

export const buildDocumentPickerNodes = (children: DriveNode[]): ChatDocumentPickerNode[] => {
  const nodes: ChatDocumentPickerNode[] = [];
  for (const child of children) {
    const node = mapDriveNodeToDocumentPickerNode(child);
    if (!node) continue;
    nodes.push(node);
  }
  return nodes;
};
