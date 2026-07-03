import { Empty, Spin } from '@/components/Feedback';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { useNavigateResource } from '@/hooks/useNavigateResource';
import { useActiveDriveScopeStore } from '@/store';
import { useRequest } from 'ahooks';
import { ChevronDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { resolveDriveScope } from '../common/driveComponentModel';
import { useDriveTreeChildren } from '../common/useDriveTreeChildren';
import { buildDriveTreeData, replaceTreeNodeChildren } from '../DriveNav/buildTreeData';
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
  const navigateResource = useNavigateResource(groupId);

  const { loadChildren, reset } = useDriveTreeChildren({
    groupId: resolvedScope.groupId,
    scope: resolvedScope.scope,
  });
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  function buildChildrenData(nodes: DriveNode[]): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_DISABLED_IDS,
      },
      nodeMapRef.current
    );
  }

  const { loading: treeLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      reset();
      setSelectedKeys([]);
      const rootNode = await driveService.getRootNode({
        rootId: resolvedScope.rootId,
        groupId: resolvedScope.groupId,
      });
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      if (rootNode.type !== 'root') return [baseRoot];
      const children = await loadChildren(rootNode.id);
      const childData = buildChildrenData(children);
      return [{ ...baseRoot, children: childData }];
    },
    {
      refreshDeps: [resolvedScope.rootId, resolvedScope.groupId],
      onSuccess: (data) => setTreeData(data),
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
    navigateResource(node.resourceId, {
      resourceType: node.resourceType,
      resourceName: node.title,
    });
  };

  const showSpin = treeLoading && treeData.length === 0;
  const showEmpty = !treeLoading && treeData.length === 0;
  const rootKey = treeData[0]?.key;

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
          onSelect={handleSelect}
          loadData={handleLoadData}
          defaultExpandedKeys={rootKey ? [rootKey] : []}
          switcherIcon={
            <span>
              <ChevronDown size={14} />
            </span>
          }
        />
      )}
    </div>
  );
}

export default SidebarDrive;
