import type { ResourceItem, SkillSummary } from '@/domains/Resource';

export const mapResourceItemToSkillSummary = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): SkillSummary => {
  const skill: SkillSummary = {
    skillId: item.resourceId,
    displayName: item.resourceName,
    description: '',
    scopeType: 'PERSONAL',
  };
  if (group) {
    skill.scopeType = 'GROUP';
    skill.groupId = group.groupId;
    skill.groupName = group.groupName;
  }
  return skill;
};
