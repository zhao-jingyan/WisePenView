import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useCallback, useState } from 'react';

interface UseDriveTreeChildrenParams {
  groupId?: string;
  scope?: DriveNodeScope;
}

interface UseDriveTreeChildrenReturn {
  childrenMap: Map<string, DriveNode[]>;
  loadChildren: (nodeId: string) => Promise<DriveNode[]>;
  reset: () => void;
}

export function useDriveTreeChildren({
  groupId,
  scope,
}: UseDriveTreeChildrenParams): UseDriveTreeChildrenReturn {
  const driveService = useDriveService();
  const [childrenMap, setChildrenMap] = useState<Map<string, DriveNode[]>>(new Map());

  const setNodeChildren = useCallback((nodeId: string, children: DriveNode[]) => {
    setChildrenMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, children);
      return next;
    });
  }, []);

  const loadChildren = useCallback(
    async (nodeId: string): Promise<DriveNode[]> => {
      setNodeChildren(nodeId, [
        driveService.buildLoadingNode({ parentNodeId: nodeId, label: '正在加载...', scope }),
      ]);
      try {
        const children = await driveService.listNodeChildren({ nodeId, groupId });
        setNodeChildren(nodeId, children);
        return children;
      } catch (err) {
        toast.danger(parseErrorMessage(err));
        setNodeChildren(nodeId, []);
        return [];
      }
    },
    [driveService, groupId, scope, setNodeChildren]
  );

  const reset = useCallback(() => {
    setChildrenMap(new Map());
  }, []);

  return {
    childrenMap,
    loadChildren,
    reset,
  };
}
