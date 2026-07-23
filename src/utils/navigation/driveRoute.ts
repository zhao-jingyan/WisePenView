import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';

const APP_DRIVE_PATH = '/app/drive';
const PERSONAL_DRIVE_PATH = `${APP_DRIVE_PATH}/personal`;
const GROUP_DRIVE_PATH = `${APP_DRIVE_PATH}/group`;

export interface DriveRouteLocation {
  scope: DriveNodeScope;
  initialNodeId?: string;
}

export interface DriveRouteParams {
  groupId?: string;
  folderId?: string;
}

export const buildDrivePath = ({
  scope,
  nodeId,
}: {
  scope: DriveNodeScope;
  nodeId?: string;
}): string => {
  const folderPath =
    nodeId && nodeId !== scope.rootId ? `/folder/${encodeURIComponent(nodeId)}` : '';
  if (scope.type === 'group') {
    return `${GROUP_DRIVE_PATH}/${encodeURIComponent(scope.groupId)}${folderPath}`;
  }
  return `${PERSONAL_DRIVE_PATH}${folderPath}`;
};

export const parseDriveInitialNodeId = (search: string): string | undefined => {
  return new URLSearchParams(search).get('folder')?.trim() || undefined;
};

export const parseDriveRouteLocation = ({
  groupId,
  folderId,
}: DriveRouteParams): DriveRouteLocation => {
  const normalizedGroupId = groupId?.trim() || undefined;
  const initialNodeId = folderId?.trim() || undefined;

  return {
    scope: buildDriveNodeScope(normalizedGroupId),
    ...(initialNodeId ? { initialNodeId } : {}),
  };
};
