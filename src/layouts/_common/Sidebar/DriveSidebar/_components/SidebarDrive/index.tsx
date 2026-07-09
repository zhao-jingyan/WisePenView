import {
  buildDriveTreeData,
  replaceTreeNodeChildren,
} from '@/components/Drive/DriveNav/buildTreeData';
import { DeleteNodeModal, NewFolderNodeModal, RenameNodeModal } from '@/components/Drive/Modals';
import {
  getDriveNodeLabel,
  resolveDriveScope,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import { useDriveTreeChildren } from '@/components/Drive/common/useDriveTreeChildren';
import { Empty, Spin } from '@/components/Feedback';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDriveService } from '@/domains';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useActiveDriveScopeStore } from '@/store';
import { useRequest } from 'ahooks';
import { useMemo, useRef, useState } from 'react';

import SidebarDriveNodeTitle from './SidebarDriveNodeTitle';
import SidebarDriveScopeSwitcher from './SidebarDriveScopeSwitcher';
import styles from './style.module.less';

const RENDERABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>([
  'root',
  'folder',
  'resource',
  'link',
]);
const SELECTABLE_TYPES = new Set<'root' | 'folder' | 'resource' | 'link'>(['resource', 'link']);
const EMPTY_DISABLED_IDS = new Set<string>();

function SidebarDrive() {
  const driveService = useDriveService();
  const groupId = useActiveDriveScopeStore((state) => state.groupId);
  const resolvedScope = useMemo(
    () => resolveDriveScope(groupId ? { type: 'group', groupId } : undefined),
    [groupId]
  );
  const openInWorkspace = useOpenInWorkspace(groupId);

  const { childrenMap, loadChildren, reset } = useDriveTreeChildren({
    groupId: resolvedScope.groupId,
    scope: resolvedScope.scope,
  });
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [createFolderParent, setCreateFolderParent] = useState<RootNode | FolderNode | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);

  const existingFolderNames = useMemo(() => {
    if (!createFolderParent) return [];
    return (childrenMap.get(createFolderParent.id) ?? [])
      .filter((node): node is FolderNode => node.type === 'folder')
      .map((node) => node.name);
  }, [childrenMap, createFolderParent]);

  const handleSelectScope = (): void => {
    setSelectedKeys([]);
    setExpandedKeys([]);
  };

  function buildChildrenData(nodes: DriveNode[]): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_DISABLED_IDS,
        renderTitle: (node) => (
          <SidebarDriveNodeTitle
            node={node}
            scopeSwitcher={
              node.type === 'root' ? (
                <SidebarDriveScopeSwitcher onSelectScope={handleSelectScope} />
              ) : undefined
            }
            onCreateFolder={setCreateFolderParent}
            onRenameNode={setRenameTarget}
            onDeleteNode={setDeleteTarget}
          />
        ),
      },
      nodeMapRef.current
    );
  }

  const { loading: treeLoading, refresh: refreshTree } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      reset();
      setSelectedKeys([]);
      setExpandedKeys([]);
      const rootNode = await driveService.getRootNode({
        rootId: resolvedScope.rootId,
        groupId: resolvedScope.groupId,
      });
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      const fixedRoot = { ...baseRoot, children: undefined, isLeaf: true };
      if (rootNode.type !== 'root') return [fixedRoot];
      const children = await loadChildren(rootNode.id);
      const childData = buildChildrenData(children);
      return [fixedRoot, ...childData];
    },
    {
      refreshDeps: [resolvedScope.rootId, resolvedScope.groupId],
      onSuccess: (data) => {
        setTreeData(data);
        setExpandedKeys([]);
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    const children = await loadChildren(node.id);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceTreeNodeChildren(prev, node.id, childData));
  };

  const handleSelect = (_keys: React.Key[], info: { node: DataNode }): void => {
    const key = String(info.node.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'resource' && node.type !== 'link')) return;
    setSelectedKeys([key]);
    if (!node.resourceId) return;
    openInWorkspace({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
    });
  };

  const handleExpand = (nextKeys: React.Key[]): void => {
    setExpandedKeys(nextKeys);
  };

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;

  return (
    <div className={styles.sidebar}>
      {showSpin ? (
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      ) : showEmpty ? (
        <div className={styles.stateBlock}>
          <Empty description="暂无内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          selectable
          expandAction="click"
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          loadData={handleLoadData}
        />
      )}
      {createFolderParent ? (
        <NewFolderNodeModal
          isOpen={Boolean(createFolderParent)}
          parentId={createFolderParent.id}
          groupId={resolvedScope.groupId}
          parentLabel={getDriveNodeLabel(createFolderParent)}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setCreateFolderParent(null);
          }}
          onSuccess={refreshTree}
        />
      ) : null}
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        groupId={resolvedScope.groupId}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshTree}
      />
      <DeleteNodeModal
        isOpen={Boolean(deleteTarget)}
        node={deleteTarget}
        groupId={resolvedScope.groupId}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={refreshTree}
      />
    </div>
  );
}

export default SidebarDrive;
