import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';

const APP_DRIVE_PATH = '/app/drive';

export interface DriveRouteLocation {
  scope: DriveNodeScope;
  initialNodeId?: string;
}

export const buildDrivePath = ({
  scope,
  nodeId,
}: {
  scope: DriveNodeScope;
  nodeId?: string;
}): string => {
  const search = new URLSearchParams();
  if (scope.type === 'group') {
    search.set('groupId', scope.groupId);
  }
  if (nodeId && nodeId !== scope.rootId) {
    search.set('folder', nodeId);
  }

  const query = search.toString();
  return query ? `${APP_DRIVE_PATH}?${query}` : APP_DRIVE_PATH;
};

export const parseDriveRouteLocation = (search: string): DriveRouteLocation => {
  const params = new URLSearchParams(search);
  const groupId = params.get('groupId')?.trim() || undefined;
  const initialNodeId = params.get('folder')?.trim() || undefined;

  return {
    scope: buildDriveNodeScope(groupId),
    ...(initialNodeId ? { initialNodeId } : {}),
  };
};
