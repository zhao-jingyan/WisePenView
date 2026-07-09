import { Tooltip } from '@heroui/react';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { ROOT_DISPLAY } from '@/components/Drive/common/constants';
import type { DriveActionTarget } from '@/components/Drive/common/driveComponentModel';
import EntryIcon from '@/components/Icons/EntryIcon';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './style.module.less';

interface SidebarDriveNodeTitleProps {
  node: DriveNode;
  scopeSwitcher?: ReactNode;
  onCreateFolder: (node: RootNode | FolderNode) => void;
  onRenameNode: (node: DriveActionTarget) => void;
  onDeleteNode: (node: DriveActionTarget) => void;
}

function stopTreeAction(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function getNodeDisplayName(node: DriveNode, resourceName: string): string {
  if (node.type === 'root') return node.name || ROOT_DISPLAY;
  if (node.type === 'folder') return node.name || ROOT_DISPLAY;
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || '正在加载...';
}

function SidebarDriveNodeTitle({
  node,
  scopeSwitcher,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
}: SidebarDriveNodeTitleProps) {
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, '未命名文件');
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const canCreateFolder = node.type === 'root' || node.type === 'folder';
  const canRename = node.type === 'folder' || node.type === 'resource';
  const canDelete = node.type === 'folder' || node.type === 'resource' || node.type === 'link';
  const label = getNodeDisplayName(node, resourceName);

  return (
    <span className={styles.nodeTitle}>
      <span className={styles.nodeMain}>
        <span className={styles.nodeIcon} aria-hidden="true">
          <EntryIcon
            entryType={node.type}
            resourceType={resourceType}
            resourceName={label}
            resourceIconType={resourceIconType}
            size={16}
          />
        </span>
        <span className={styles.nodeLabel} title={label}>
          {label}
        </span>
      </span>
      {canCreateFolder || canDelete ? (
        <span
          className={clsx(styles.nodeActions, node.type === 'root' && styles.nodeActionsPinned)}
          onClick={stopTreeAction}
          onKeyDown={stopTreeAction}
        >
          {node.type === 'root' ? scopeSwitcher : null}
          {canCreateFolder ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.nodeActionBtn}
                  aria-label={`在${label}中新建文件夹`}
                  onClick={() => onCreateFolder(node)}
                >
                  <FolderPlus size={14} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>新建文件夹</Tooltip.Content>
            </Tooltip>
          ) : null}
          {canRename ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.nodeActionBtn}
                  aria-label={`重命名${label}`}
                  onClick={() => onRenameNode(node)}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>重命名</Tooltip.Content>
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.nodeActionBtn}
                  aria-label={`删除${label}`}
                  onClick={() => onDeleteNode(node)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>删除</Tooltip.Content>
            </Tooltip>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export default SidebarDriveNodeTitle;
