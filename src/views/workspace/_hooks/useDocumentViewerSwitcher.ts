import { RESOURCE_KIND, type ResourceViewer } from '@/utils/navigation/resourceTarget';
import { buildWorkspaceResourcePathWithSearch } from '@/utils/navigation/workspaceRoute';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useDocumentViewerSwitcher(resourceId?: string) {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (viewer: ResourceViewer) => {
      if (!resourceId) return;

      navigate(
        buildWorkspaceResourcePathWithSearch(
          {
            resourceId,
            resourceType: RESOURCE_KIND.FILE,
            viewer,
          },
          location.search
        ),
        { replace: true }
      );
    },
    [location.search, navigate, resourceId]
  );
}
