import { useActiveDriveScopeStore, usePdfPreviewProgressStore } from '@/store';
import {
  buildWorkspaceResourcePath,
  isDocumentEditorType,
  resolveResourceEditorType,
} from '@/utils/navigation/workspaceRoute';
import { useNavigate } from 'react-router-dom';

export interface NavigateResourceTarget {
  resourceType?: string;
  resourceName?: string;
}

export interface NavigateResourceFn {
  (resourceId: string, target?: NavigateResourceTarget): void;
}

/**
 * 资源跳转的统一入口：先解析 editorType，再进入统一 workspace 路由。
 *
 * 跳转前会把当前 scope（groupId）写入 useActiveDriveScopeStore，
 * 让 SidebarDrive 等下游消费组件继承“点击发起方”的 scope。
 */
export const useNavigateResource = (groupId?: string): NavigateResourceFn => {
  const navigate = useNavigate();

  return (resourceId, target) => {
    if (!resourceId) return;
    useActiveDriveScopeStore.getState().setGroupId(groupId);

    const editorType = resolveResourceEditorType({
      resourceType: target?.resourceType,
      resourceName: target?.resourceName,
    });
    const basePath = buildWorkspaceResourcePath(editorType, resourceId);

    if (!isDocumentEditorType(editorType)) {
      navigate(basePath);
      return;
    }

    const progress = usePdfPreviewProgressStore.getState().progressByResourceId[resourceId];
    const qs = new URLSearchParams();
    if (progress != null) {
      qs.set('page', String(progress.page));
      qs.set('zoom', progress.zoom);
    }
    navigate(qs.size > 0 ? `${basePath}?${qs.toString()}` : basePath);
  };
};
