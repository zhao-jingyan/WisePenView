import { ResultState, Spin } from '@/components/Feedback';
import PdfViewer from '@/components/PdfViewer/index';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { useResourceHostLayoutConfig } from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './style.module.less';

interface PdfLayoutConfigProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

function PdfLayoutConfig({
  children,
  resourceInfo,
  onPermissionSuccess,
  onResourceChanged,
}: PdfLayoutConfigProps) {
  const frameConfig = useMemo(
    () => ({
      className: styles.container,
      sidePanel: resourceInfo ? { resource: resourceInfo, onResourceChanged } : undefined,
      header: resourceInfo
        ? {
            resource: {
              resourceId: resourceInfo.resourceId,
              resourceName: resourceInfo.resourceName,
              resourceType: resourceInfo.resourceType,
              currentActions: resourceInfo.currentActions,
              permissionResourceType: RESOURCE_KIND.FILE,
              ownerId: resourceInfo.ownerId,
              onPermissionSuccess,
            },
          }
        : {},
    }),
    [onPermissionSuccess, onResourceChanged, resourceInfo]
  );
  useResourceHostLayoutConfig(frameConfig);

  return <>{children}</>;
}

interface DocumentPreviewProps {
  resourceId?: string;
}

function DocumentPreview({ resourceId }: DocumentPreviewProps = {}) {
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const interactService = useInteractService();
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
  useRequest(() => interactService.recordResourceRead(resourceId as string), {
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

  return (
    <PdfLayoutConfig
      resourceInfo={docInfo.resourceInfo}
      onPermissionSuccess={refreshDocInfo}
      onResourceChanged={refreshDocInfo}
    >
      <div className={styles.content}>
        <div className={styles.root}>
          {viewerError ? (
            <div className={styles.viewerFailure}>
              <ResultState
                status="warning"
                title="文档预览失败"
                subTitle={parseErrorMessage(viewerError)}
                extra={
                  <Button
                    variant="secondary"
                    onPress={() =>
                      setViewerErrorMap((current) => ({
                        ...current,
                        [currentResourceId]: undefined,
                      }))
                    }
                  >
                    重试预览
                  </Button>
                }
              />
            </div>
          ) : (
            <PdfViewer
              key={resourceId}
              className={styles.viewer}
              resourceId={resourceId}
              onLoadError={handleViewerLoadError}
            />
          )}
        </div>
      </div>
    </PdfLayoutConfig>
  );
}

export default DocumentPreview;
