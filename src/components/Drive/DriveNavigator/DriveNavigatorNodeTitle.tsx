import { ROOT_DISPLAY } from '@/components/Drive/common/constants';
import EntryIcon from '@/components/Icons/EntryIcon';
import type { DriveNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import styles from './style.module.less';

interface DriveNavigatorNodeTitleProps {
  node: DriveNode;
  displayName?: string;
}

function getNodeDisplayName(
  node: DriveNavigatorNodeTitleProps['node'],
  resourceName: string,
  displayName?: string
): string {
  if (displayName) return displayName;
  if (node.type === 'root') return node.name || ROOT_DISPLAY;
  if (node.type === 'folder') {
    if (!node.parentId) return ROOT_DISPLAY;
    return node.name || ROOT_DISPLAY;
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || '正在加载...';
}

function DriveNavigatorNodeTitle({ node, displayName }: DriveNavigatorNodeTitleProps) {
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, '未命名文件');
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;

  return (
    <span className={styles.nodeTitle}>
      <span className={styles.nodeIcon} aria-hidden="true">
        <EntryIcon
          entryType={node.type}
          folderIconType={folderIconType}
          resourceType={resourceType}
          resourceIconType={resourceIconType}
          size={14}
        />
      </span>
      <span className={styles.nodeLabel}>
        {getNodeDisplayName(node, resourceName, displayName)}
      </span>
    </span>
  );
}

export default DriveNavigatorNodeTitle;
