import type { ResourceItem, SkillSummary } from '@/domains/Resource';

export const mapResourceItemToSkillSummary = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): SkillSummary => ({
  skillId: item.resourceId,
  displayName: item.resourceName,
  description: '',
  scopeType: group ? 'GROUP' : 'PERSONAL',
  ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
});
