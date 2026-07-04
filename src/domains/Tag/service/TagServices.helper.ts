import type { GetUserResourcesRequest } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import type { TagTreeNode } from './index.type';

export const TAG_CACHE_KEY_DEFAULT = '__default__';

const HIDDEN_TAG_PREFIX = '.';

export const buildTagFlatMap = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
  const map = new Map<string, TagTreeNode>();

  const walk = (node: TagTreeNode): void => {
    map.set(node.tagId, node);
    for (const child of node.children) {
      walk(child);
    }
  };

  for (const root of roots) {
    walk(root);
  }

  return map;
};

const filterHiddenTags = (nodes: TagTreeNode[]): TagTreeNode[] => {
  const filtered: TagTreeNode[] = [];
  for (const node of nodes) {
    if (node.tagName.trim().startsWith(HIDDEN_TAG_PREFIX)) {
      continue;
    }
    const visibleNode: TagTreeNode = {
      tagId: node.tagId,
      tagName: node.tagName,
      groupId: node.groupId,
      tagDesc: node.tagDesc,
      tagIcon: node.tagIcon,
      tagColor: node.tagColor,
      tagCreator: node.tagCreator,
      isPath: node.isPath,
      visibilityMode: node.visibilityMode,
      taggedResourceAclGrantScope: node.taggedResourceAclGrantScope,
      taggedResourceAclGrantSpecifiedUsers: node.taggedResourceAclGrantSpecifiedUsers,
      taggedResourceGrantedActionsMask: node.taggedResourceGrantedActionsMask,
      tagMountPermissionScope: node.tagMountPermissionScope,
      tagMountSpecifiedUsers: node.tagMountSpecifiedUsers,
      grantedActions: node.grantedActions,
      parentId: node.parentId,
      children: filterHiddenTags(node.children),
    };
    filtered.push(visibleNode);
  }
  return filtered;
};

export const filterTagTreeForView = (rawRoots: TagTreeNode[]): TagTreeNode[] => {
  const nonFolderRoots: TagTreeNode[] = [];
  for (const item of rawRoots) {
    if (item.tagName && item.tagName.startsWith('/')) continue;
    nonFolderRoots.push(item);
  }
  return filterHiddenTags(nonFolderRoots);
};

export const buildTaggedResourceListRequest = (
  tagId: string,
  page: number,
  size: number
): GetUserResourcesRequest => {
  return {
    page,
    size,
    sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
    sortDir: RESOURCE_SORT_DIR.DESC,
    tagIds: [tagId],
    tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.AND,
  };
};
