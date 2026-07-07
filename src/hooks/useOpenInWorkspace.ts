import { useActiveDriveScopeStore, usePdfPreviewProgressStore } from '@/store';
import {
  WORKSPACE_VIEWER,
  buildWorkspaceResourcePath,
  resolveWorkspaceResourceType,
  resolveWorkspaceViewer,
  type WorkspaceViewer,
} from '@/utils/navigation/workspaceRoute';
import { startTransition, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface OpenInWorkspaceTarget {
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
  viewer?: WorkspaceViewer | string;
  groupId?: string;
  replace?: boolean;
}

export interface OpenInWorkspaceFn {
  (target: OpenInWorkspaceTarget): void;
}

const appendPdfPreviewProgress = (path: string, resourceId: string, viewer?: WorkspaceViewer) => {
  if (viewer !== WORKSPACE_VIEWER.PDF_PREVIEW) return path;

  const progress = usePdfPreviewProgressStore.getState().progressByResourceId[resourceId];
  if (progress == null) return path;

  const [pathname, search = ''] = path.split('?');
  const qs = new URLSearchParams(search);
  qs.set('page', String(progress.page));
  qs.set('zoom', progress.zoom);
  return `${pathname}?${qs.toString()}`;
};

/**
 * Workspace 资源打开入口。负责 scope 继承、资源身份归一化、viewer 推导与 PDF 进度恢复。
 */
export const useOpenInWorkspace = (defaultGroupId?: string): OpenInWorkspaceFn => {
  const navigate = useNavigate();

  return useCallback(
    (target) => {
      const resourceId = target.resourceId.trim();
      if (!resourceId) return;

      useActiveDriveScopeStore.getState().setGroupId(target.groupId ?? defaultGroupId);

      const resourceType = resolveWorkspaceResourceType({
        resourceType: target.resourceType,
        resourceName: target.resourceName,
      });
      const viewer = resolveWorkspaceViewer({
        resourceType: target.resourceType ?? resourceType,
        resourceName: target.resourceName,
        viewer: target.viewer,
      });
      const basePath = buildWorkspaceResourcePath({ resourceType, resourceId, viewer });
      const path = appendPdfPreviewProgress(basePath, resourceId, viewer);

      startTransition(() => {
        navigate(path, { replace: target.replace });
      });
    },
    [defaultGroupId, navigate]
  );
};
