import type { ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { GetGroupResourceRequest, UpdateResourceTagsRequest } from './index.type';

export const GROUP_RESOURCE_SCAN_PAGE_SIZE = 200;

export interface GroupMountTags {
  tagIds: string[];
  primaryTagId?: string;
}

export const uniqueNonEmptyIds = (ids: string[]): string[] => {
  const result: string[] = [];
  const seenIds = new Set<string>();

  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    if (seenIds.has(trimmed)) continue;
    seenIds.add(trimmed);
    result.push(trimmed);
  }

  return result;
};

const getCurrentTagIdsForExistingResource = (item: ResourceItem | undefined): string[] => {
  // 未查到资源时按首次挂载处理；已查到的 ResourceItem 由 mapper 保证 currentTags 为稳定对象。
  if (!item) return [];
  return Object.keys(item.currentTags);
};

export const resolveGroupMountTags = (
  item: ResourceItem | undefined,
  targetTagId: string
): GroupMountTags => {
  const currentTagIds = getCurrentTagIdsForExistingResource(item);
  const primaryTagId = item?.mainTagId;

  if (primaryTagId) {
    const tagIds = uniqueNonEmptyIds([primaryTagId]);
    for (const tagId of currentTagIds) {
      if (tagId === primaryTagId) continue;
      tagIds.push(tagId);
    }
    tagIds.push(targetTagId);
    return { tagIds: uniqueNonEmptyIds(tagIds) };
  }

  const tagIds = uniqueNonEmptyIds([targetTagId]);
  for (const tagId of currentTagIds) {
    tagIds.push(tagId);
  }

  return {
    tagIds: uniqueNonEmptyIds(tagIds),
    primaryTagId: targetTagId,
  };
};

export const buildGroupResourceScanRequest = (
  groupId: string,
  page: number
): GetGroupResourceRequest => {
  return {
    groupId,
    page,
    size: GROUP_RESOURCE_SCAN_PAGE_SIZE,
    sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
    sortDir: RESOURCE_SORT_DIR.DESC,
  };
};

export const buildGroupMountResourceRequest = (
  resourceId: string,
  groupId: string,
  tags: GroupMountTags
): UpdateResourceTagsRequest => {
  const request: UpdateResourceTagsRequest = {
    resourceId,
    groupId,
    tagIds: tags.tagIds,
  };

  if (tags.primaryTagId) {
    request.primaryTagId = tags.primaryTagId;
  }

  return request;
};
