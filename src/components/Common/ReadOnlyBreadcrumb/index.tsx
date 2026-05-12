import { ROOT_DISPLAY } from '@/components/Drive/TreeNav/folderUtil';
import { useFolderService, useTagService } from '@/domains';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';
import React, { useMemo } from 'react';
import type { ReadOnlyBreadcrumbProps } from './index.type';
import styles from './style.module.less';

const getDisplayName = (node: TagTreeNode, mode: 'folder' | 'tag'): string => {
  if (mode === 'folder') {
    if (node.tagName === '/') return ROOT_DISPLAY;
    return node.tagName.startsWith('/') ? node.tagName.slice(1) : node.tagName;
  }
  return node.tagName;
};

const ReadOnlyBreadcrumb: React.FC<ReadOnlyBreadcrumbProps> = ({ node, mode, groupId }) => {
  const folderService = useFolderService();
  const tagService = useTagService();

  const breadcrumbPath = useMemo(() => {
    if (!node) return [];

    const path: TagTreeNode[] = [];
    let current: TagTreeNode | undefined = node;

    while (current) {
      path.unshift(current);
      if (!current.parentId) break;
      current =
        mode === 'folder'
          ? (folderService.getFolderById(current.parentId, groupId) as TagTreeNode | undefined)
          : tagService.getTagById(current.parentId, groupId);
    }

    return path;
  }, [node, mode, groupId, folderService, tagService]);

  if (breadcrumbPath.length === 0) return null;

  const sep = mode === 'tag' ? '>' : '/';

  return (
    <div className={styles.breadcrumb}>
      {breadcrumbPath.map((n, i) => (
        <React.Fragment key={n.tagId}>
          {i > 0 && <span className={styles.sep}>{sep}</span>}
          <span className={styles.item}>{getDisplayName(n, mode)}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ReadOnlyBreadcrumb;
