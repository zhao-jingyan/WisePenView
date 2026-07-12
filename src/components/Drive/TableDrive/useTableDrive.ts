import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { startTransition, useCallback, useMemo, useState } from 'react';
import { useDriveTreeChildren } from '../common/useDriveTreeChildren';
import type { DriveRow } from './index.type';

interface UseTableDriveParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
}

interface UseTableDriveReturn {
  currentNodeId: string;
  /** 当前层级的 dataSource（已挂上 expanded children） */
  dataSource: DriveRow[];
  /** breadcrumb 路径（含目标节点本身） */
  pathNodes: DriveNode[];
  loading: boolean;
  expandedRowKeys: string[];
  /** 进入容器目录（root / folder 调用） */
  enterFolder: (nodeId: string) => void;
  /** Table 的 onExpand 回调 */
  handleExpand: (expanded: boolean, record: DriveRow) => Promise<void>;
  /** 重新拉取当前层级 children（移动 / 重命名 / 删除 等操作后调用） */
  refresh: () => void;
}

interface DrivePathResult {
  navigationKey: string;
  nodes: DriveNode[];
}

/**
 * TableDrive 核心 hook：
 * - 维护 currentNodeId / rows / expandedRowKeys / expandedChildrenMap
 * - 通过 driveService 派生 children + breadcrumb，分页状态机收敛在 service 内部
 */
export function useTableDrive({ initialNodeId, scope }: UseTableDriveParams): UseTableDriveReturn {
  const driveService = useDriveService();
  const rootId = scope.rootId;
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const { childrenMap, loadChildren, reset } = useDriveTreeChildren({ groupId, scope });

  const navigationKey = `${rootId}\u0000${initialNodeId ?? ''}`;
  const initialCurrentNodeId = initialNodeId ?? rootId;
  const [currentLocation, setCurrentLocation] = useState({
    navigationKey,
    nodeId: initialCurrentNodeId,
  });
  const currentNodeId =
    currentLocation.navigationKey === navigationKey ? currentLocation.nodeId : initialCurrentNodeId;
  const [rows, setRows] = useState<DriveRow[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // 切换 currentNodeId / groupId：拉取当前层级 children
  const { loading, refresh } = useRequest(
    async () => {
      reset();
      return loadChildren(currentNodeId);
    },
    {
      refreshDeps: [currentNodeId, groupId, rootId],
      onBefore: () => {
        setExpandedRowKeys([]);
      },
      onSuccess: (children) => {
        setRows(children as DriveRow[]);
      },
    }
  );

  // 派生 breadcrumb 路径
  const { data: pathResult } = useRequest(
    async (): Promise<DrivePathResult> => ({
      navigationKey: `${navigationKey}\u0000${currentNodeId}`,
      nodes: await driveService.getNodePath({ nodeId: currentNodeId, groupId }),
    }),
    {
      refreshDeps: [currentNodeId, groupId],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
        if (currentNodeId !== rootId) {
          setCurrentLocation({ navigationKey, nodeId: rootId });
        }
      },
    }
  );
  const pathNodes =
    pathResult?.navigationKey === `${navigationKey}\u0000${currentNodeId}` ? pathResult.nodes : [];

  const enterFolder = useCallback(
    (nodeId: string) => {
      startTransition(() => {
        setCurrentLocation({ navigationKey, nodeId });
      });
    },
    [navigationKey]
  );

  const handleExpand = useCallback(
    async (expanded: boolean, record: DriveRow) => {
      if (!expanded || (record.type !== 'root' && record.type !== 'folder')) {
        setExpandedRowKeys((keys) => keys.filter((k) => k !== record.id));
        return;
      }
      if (!childrenMap.has(record.id)) {
        await loadChildren(record.id);
      }
      setExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
    },
    [childrenMap, loadChildren]
  );

  // 浅 map：folder 命中 expandedChildrenMap 时挂 children，否则原样返回
  const dataSource = useMemo<DriveRow[]>(() => {
    return rows.map((row) => attachChildren(row, childrenMap));
  }, [rows, childrenMap]);

  return {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    expandedRowKeys,
    enterFolder,
    handleExpand,
    refresh,
  };
}

function attachChildren(row: DriveRow, map: Map<string, DriveNode[]>): DriveRow {
  if (row.type !== 'root' && row.type !== 'folder') return row;
  const cached = map.get(row.id) as DriveRow[] | undefined;
  if (!cached) return row;
  return { ...row, children: cached.map((c) => attachChildren(c, map)) };
}
