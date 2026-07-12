export type SkillScopeType = 'PERSONAL' | 'GROUP';

/** 从资源列表归一化出的 Chat 工作区技能选项。 */
export interface ResourceSkillSummary {
  skillId: string;
  displayName: string;
  description?: string;
  currentVersionId?: string;
  scopeType: SkillScopeType;
  groupId?: string;
  groupName?: string;
}
