import type { ChatWorkspace, ToolOption } from '@/domains/Chat';
import { buildDriveNodeScope, type DriveNode } from '@/domains/Drive';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { DEFAULT_PERSONAL_AGENT } from './ChatInputStore';

type ChatAgent = ChatWorkspace['personalAgents'][number];

export interface SkillScopeTreeGroup {
  key: string;
  label: string;
  skills: SkillSummary[];
}

export interface ChatInputSkillMenuOptions {
  primarySkills: SkillSummary[];
  otherSkillGroups: SkillScopeTreeGroup[];
  tools: ToolOption[];
}

export interface GetChatInputSkillMenuOptionsParams {
  agent: ChatAgentOption | null;
}

export type ChatDocumentPickerScopeType = 'personal' | 'group';

export interface ChatDocumentPickerScope {
  scopeKey: string;
  label: string;
  rootId: string;
  type: ChatDocumentPickerScopeType;
  groupId?: string;
}

export type ChatDocumentPickerNodeType = 'root' | 'folder' | 'resource' | 'link';

export interface ChatDocumentPickerNode {
  nodeId: string;
  title: string;
  type: ChatDocumentPickerNodeType;
  groupId: string | null;
  resourceId: string | null;
  resourceName: string | null;
  resourceType: string | null;
  isLeaf: boolean;
  selectable: boolean;
}

export interface ChatDocumentPickerSelectedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

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
  workspace: Pick<ChatWorkspace, 'groups' | 'skills'>,
  currentAgent?: ChatAgent | null,
  currentAgentSkills: SkillSummary[] = []
): SkillScopeTreeGroup[] => {
  const groupSkillMap = new Map<string, SkillSummary[]>();
  const personalSkills: SkillSummary[] = [];

  for (const skill of workspace.skills) {
    if (skill.scopeType !== 'GROUP') {
      personalSkills.push(skill);
      continue;
    }
    if (!skill.groupId) continue;
    const existing = groupSkillMap.get(skill.groupId) ?? [];
    existing.push(skill);
    groupSkillMap.set(skill.groupId, existing);
  }

  const result: SkillScopeTreeGroup[] = [];
  const knownGroupIds = new Set<string>();
  for (const group of workspace.groups) {
    knownGroupIds.add(group.groupId);
    const groupSkills = groupSkillMap.get(group.groupId) ?? [];
    if (groupSkills.length === 0) continue;
    result.push({
      key: `group-${group.groupId}`,
      label: group.groupName,
      skills: groupSkills,
    });
  }

  for (const [groupId, groupSkills] of groupSkillMap.entries()) {
    if (knownGroupIds.has(groupId)) continue;
    result.push({
      key: `group-${groupId}`,
      label: groupSkills[0]?.groupName || groupId,
      skills: groupSkills,
    });
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
    const alreadyIncluded = result.some((group) => group.key === currentGroup.key);
    if (!alreadyIncluded) {
      const personalIndex = result.findIndex((group) => group.key === 'personal');
      if (currentGroup.key === 'personal' || personalIndex === -1) {
        result.push(currentGroup);
      } else {
        result.splice(personalIndex, 0, currentGroup);
      }
    }
  }

  return result;
};

export const buildChatInputAgents = (
  workspace: Pick<ChatWorkspace, 'personalAgents' | 'groupAgents'>
): ChatAgentOption[] => {
  return [DEFAULT_PERSONAL_AGENT, ...workspace.personalAgents, ...workspace.groupAgents];
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
  const allOtherSkillGroups = buildAdvancedSkillTreeGroups(workspace, params.agent, primarySkills);
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

export function buildDocumentPickerScopes(
  groups: ChatWorkspace['groups']
): ChatDocumentPickerScope[] {
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
