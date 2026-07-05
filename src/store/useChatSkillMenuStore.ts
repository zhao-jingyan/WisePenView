import type { SkillSummary } from '@/domains/Resource';
import { create } from 'zustand';
import type { ChatAgentOption } from './useChatAgentStore';

export interface ChatSkillMenuSelectedSkill {
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

export interface ChatSkillMenuSelectedTool {
  toolId: string;
  label: string;
}

interface ChatSkillMenuState {
  selectedSkills: ChatSkillMenuSelectedSkill[];
  selectedTools: ChatSkillMenuSelectedTool[];
  toggleSkill: (
    skill: SkillSummary,
    options?: { sourceAgent?: ChatAgentOption | null; external?: boolean }
  ) => void;
  removeSkill: (skillId: string) => void;
  toggleTool: (tool: ChatSkillMenuSelectedTool) => void;
  clearSkillMenuSelections: () => void;
}

const INITIAL_STATE = {
  selectedSkills: [],
  selectedTools: [],
};

export const useChatSkillMenuStore = create<ChatSkillMenuState>()((set) => ({
  ...INITIAL_STATE,

  toggleSkill: (skill, options) =>
    set((state) => {
      const exists = state.selectedSkills.some((item) => item.skillId === skill.skillId);
      if (exists) {
        return {
          selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skill.skillId),
        };
      }

      const sourceAgent = options?.sourceAgent;
      const external =
        options?.external ??
        (Boolean(sourceAgent) &&
          (sourceAgent?.agentType === 'GROUP'
            ? sourceAgent.groupId !== skill.groupId
            : skill.scopeType === 'GROUP'));
      return {
        selectedSkills: [
          ...state.selectedSkills,
          {
            skillId: skill.skillId,
            displayName: skill.displayName,
            currentVersionId: skill.currentVersionId,
            scopeType: skill.scopeType,
            groupId: skill.groupId,
            groupName: skill.groupName,
            sourceAgentId: sourceAgent?.agentId,
            sourceAgentLabel: sourceAgent?.label,
            external,
          },
        ],
      };
    }),

  removeSkill: (skillId) =>
    set((state) => ({
      selectedSkills: state.selectedSkills.filter((item) => item.skillId !== skillId),
    })),

  toggleTool: (tool) =>
    set((state) => {
      const exists = state.selectedTools.some((item) => item.toolId === tool.toolId);
      return exists
        ? {
            selectedTools: state.selectedTools.filter((item) => item.toolId !== tool.toolId),
          }
        : {
            selectedTools: [...state.selectedTools, tool],
          };
    }),

  clearSkillMenuSelections: () => set(INITIAL_STATE),
}));

export const clearChatSkillMenuStore = (): void => {
  useChatSkillMenuStore.setState(INITIAL_STATE);
};
