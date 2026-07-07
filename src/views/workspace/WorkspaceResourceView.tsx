import { ResultState, Spin } from '@/components/Feedback';
import { useDocumentService } from '@/domains';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import {
  WORKSPACE_RESOURCE_TYPE,
  WORKSPACE_VIEWER,
  buildWorkspaceResourcePathWithSearch,
  isWorkspaceViewerCompatible,
  normalizeWorkspaceResourceType,
  normalizeWorkspaceViewer,
  resolveLegacyWorkspaceRedirectTarget,
  resolveWorkspaceViewer,
} from '@/utils/navigation/workspaceRoute';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import DrawioView from './drawio';
import NoteView from './note';
import OfficeView from './office';
import DocumentPreview from './pdf';
import SkillView from './skill';
import styles from './WorkspaceResourceView.module.less';

interface UnsupportedResourceProps {
  resourceType?: string;
  resourceId?: string;
  viewer?: string;
  message?: string;
}

interface FileViewerResolverProps {
  resourceId: string;
}

function UnsupportedResource({
  resourceType,
  resourceId,
  viewer,
  message,
}: UnsupportedResourceProps) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(() => ({ header: false }), []);
  useWorkspaceLayoutConfig(frameConfig);

  const readableType = resourceType ? `资源类型：${resourceType}` : undefined;
  const readableViewer = viewer ? `打开方式：${viewer}` : undefined;
  const subTitle = message ?? [readableType, readableViewer].filter(Boolean).join('，');

  return (
    <div className={styles.middleOverlay}>
      <div className={styles.middleOverlayInner}>
        <ResultState
          status="warning"
          title={resourceId ? '暂不支持打开该资源' : '无法打开资源'}
          subTitle={subTitle || undefined}
          extra={
            <Link to="/app/drive">
              <Button variant="secondary">返回云盘</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}

function FileViewerResolver({ resourceId }: FileViewerResolverProps) {
  const documentService = useDocumentService();
  const navigate = useNavigate();
  const location = useLocation();
  const frameConfig = useMemo<WorkspaceLayoutConfig>(() => ({ header: false }), []);
  useWorkspaceLayoutConfig(frameConfig);

  const {
    data: docInfo,
    error,
    loading,
  } = useRequest(async () => documentService.getDocInfo(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId, location.search],
    onSuccess: (data) => {
      const viewer = resolveWorkspaceViewer({
        resourceType: WORKSPACE_RESOURCE_TYPE.FILE,
        resourceName: data.resourceInfo.resourceName,
      });
      if (!viewer) return;

      navigate(
        buildWorkspaceResourcePathWithSearch(
          {
            resourceType: WORKSPACE_RESOURCE_TYPE.FILE,
            resourceId,
            viewer,
          },
          location.search
        ),
        { replace: true }
      );
    },
  });

  if (error) {
    return (
      <UnsupportedResource
        resourceType={WORKSPACE_RESOURCE_TYPE.FILE}
        resourceId={resourceId}
        message={parseErrorMessage(error)}
      />
    );
  }

  if (loading || !docInfo) {
    return (
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>正在解析文件打开方式...</span>
        </div>
      </div>
    );
  }

  return (
    <UnsupportedResource
      resourceType={WORKSPACE_RESOURCE_TYPE.FILE}
      resourceId={resourceId}
      message="无法从文件信息判断打开方式"
    />
  );
}

function WorkspaceResourceView() {
  const { resourceType: rawResourceType, resourceId } = useParams<{
    resourceType?: string;
    resourceId?: string;
  }>();
  const location = useLocation();
  const viewerParam = new URLSearchParams(location.search).get('viewer') ?? undefined;
  const legacyRedirectTarget = resolveLegacyWorkspaceRedirectTarget({
    resourceType: rawResourceType,
    resourceId,
    viewer: viewerParam,
  });

  if (legacyRedirectTarget) {
    return (
      <Navigate
        to={buildWorkspaceResourcePathWithSearch(legacyRedirectTarget, location.search)}
        replace
      />
    );
  }

  const resourceType = normalizeWorkspaceResourceType(rawResourceType);
  const explicitViewer = normalizeWorkspaceViewer(viewerParam);
  const viewer = resolveWorkspaceViewer({
    resourceType: rawResourceType,
    viewer: viewerParam,
  });

  if (viewerParam && !explicitViewer) {
    return (
      <UnsupportedResource
        resourceType={rawResourceType}
        resourceId={resourceId}
        viewer={viewerParam}
      />
    );
  }

  if (!resourceType) {
    return <UnsupportedResource resourceType={rawResourceType} />;
  }

  if (resourceType === WORKSPACE_RESOURCE_TYPE.SKILL && !resourceId) {
    return <SkillView />;
  }

  if (!resourceId) {
    return <UnsupportedResource resourceType={rawResourceType} />;
  }

  if (!isWorkspaceViewerCompatible(resourceType, viewer)) {
    return (
      <UnsupportedResource resourceType={resourceType} resourceId={resourceId} viewer={viewer} />
    );
  }

  if (resourceType === WORKSPACE_RESOURCE_TYPE.NOTE) {
    return <NoteView resourceId={resourceId} />;
  }

  if (resourceType === WORKSPACE_RESOURCE_TYPE.DRAWIO) {
    return <DrawioView resourceId={resourceId} />;
  }

  if (resourceType === WORKSPACE_RESOURCE_TYPE.SKILL) {
    return <SkillView resourceId={resourceId} />;
  }

  if (resourceType === WORKSPACE_RESOURCE_TYPE.FILE) {
    if (!viewer) {
      return <FileViewerResolver resourceId={resourceId} />;
    }
    if (viewer === WORKSPACE_VIEWER.PDF_PREVIEW) {
      return <DocumentPreview resourceId={resourceId} />;
    }
    if (viewer === WORKSPACE_VIEWER.OFFICE) {
      return <OfficeView resourceId={resourceId} />;
    }
  }

  return (
    <UnsupportedResource resourceType={resourceType} resourceId={resourceId} viewer={viewer} />
  );
}

export default WorkspaceResourceView;
