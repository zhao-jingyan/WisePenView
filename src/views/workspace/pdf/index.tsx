import { ResultState, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import PdfViewer from '@/components/PdfViewer/index';
import { useDocumentService, useResourceService } from '@/domains';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useWorkspaceLayoutConfig } from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ResourcePermissionControl from '../_components/ResourcePermissionControl';
import styles from './style.module.less';

interface PdfToolbarTitleProps {
  resourceName: string;
  resourceType?: string;
}

function PdfToolbarTitle({ resourceName, resourceType }: PdfToolbarTitleProps) {
  return (
    <span className={styles.toolbarTitleText}>
      <span className={styles.toolbarTitleIcon} aria-hidden="true">
        <EntryIcon entryType="resource" resourceType={resourceType ?? RESOURCE_TYPE.FILE} />
      </span>
      <span className={styles.toolbarTitleLabel}>{resourceName}</span>
    </span>
  );
}

interface PdfLayoutConfigProps {
  children: ReactNode;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
}

function PdfLayoutConfig({
  children,
  resourceId,
  resourceName,
  resourceType,
  ownerId,
  onPermissionSuccess,
}: PdfLayoutConfigProps) {
  const frameConfig = useMemo(
    () => ({
      className: styles.container,
      header: resourceName
        ? {
            inlineTitle: (
              <PdfToolbarTitle resourceName={resourceName} resourceType={resourceType} />
            ),
            extra: resourceId ? (
              <ResourcePermissionControl
                resourceId={resourceId}
                resourceType={WORKSPACE_RESOURCE_TYPE.FILE}
                ownerId={ownerId}
                onSuccess={onPermissionSuccess}
              />
            ) : undefined,
          }
        : {},
    }),
    [onPermissionSuccess, ownerId, resourceId, resourceName, resourceType]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

interface DocumentPreviewProps {
  resourceId?: string;
}

function DocumentPreview({ resourceId }: DocumentPreviewProps = {}) {
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
    refresh: refreshDocInfo,
  } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  // 进入页面时上报阅读
  useRequest(() => resourceService.interactRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const currentResourceId = resourceId ?? '';
  const viewerError = viewerErrorMap[currentResourceId];
  const handleViewerLoadError = (error: unknown) => {
    if (!currentResourceId) {
      return;
    }
    setViewerErrorMap((prev) => ({
      ...prev,
      [currentResourceId]: error,
    }));
  };

  if (!resourceId) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开文档"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  if (docInfoError) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开文档"
              subTitle={parseErrorMessage(docInfoError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  // 仅在初次加载（尚无数据）时展示全页 spinner；refresh 时保留旧 docInfo，不触发全页 loading
  if (isDocInfoLoading && !docInfo) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在加载文档信息...</span>
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  if (!docInfo) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开文档"
              subTitle="文档信息为空，请稍后重试"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  if (viewerError) {
    return (
      <PdfLayoutConfig
        resourceId={docInfo.resourceInfo.resourceId || resourceId}
        resourceName={docInfo.resourceInfo.resourceName}
        resourceType={docInfo.resourceInfo.resourceType}
        ownerId={docInfo.resourceInfo.ownerId}
        onPermissionSuccess={refreshDocInfo}
      >
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="文档预览失败"
              subTitle={parseErrorMessage(viewerError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  return (
    <PdfLayoutConfig
      resourceId={docInfo.resourceInfo.resourceId || resourceId}
      resourceName={docInfo.resourceInfo.resourceName}
      resourceType={docInfo.resourceInfo.resourceType}
      ownerId={docInfo.resourceInfo.ownerId}
      onPermissionSuccess={refreshDocInfo}
    >
      <div className={styles.content}>
        <div className={styles.root}>
          <PdfViewer
            key={resourceId}
            className={styles.viewer}
            resourceId={resourceId}
            onLoadError={handleViewerLoadError}
          />
        </div>
      </div>
    </PdfLayoutConfig>
  );
}

export default DocumentPreview;
