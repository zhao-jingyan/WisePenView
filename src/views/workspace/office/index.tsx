import { ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL } from '@/apis/clientUrls';
import { ResultState, Spin } from '@/components/Feedback';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  DEFAULT_RESOURCE_HOST_ID,
  useResourceHostId,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import type { Config } from '@onlyoffice/doceditor-types';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './style.module.less';

interface OfficeLayoutConfigProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

interface OfficeEditorHostProps {
  config: Config;
  documentServerUrl: string;
  resourceId: string;
  onReady: () => void;
  onError: (error: unknown) => void;
}

interface OfficeViewProps {
  resourceId?: string;
}

function OfficeLayoutConfig({
  children,
  resourceInfo,
  onPermissionSuccess,
  onResourceChanged,
}: OfficeLayoutConfigProps) {
  const frameConfig = useMemo<ResourceHostLayoutConfig>(
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

function OfficeEditorHost({
  config,
  documentServerUrl,
  resourceId,
  onReady,
  onError,
}: OfficeEditorHostProps) {
  const hostId = useResourceHostId();
  const containerId = useMemo(() => {
    const safeResourceId = resourceId.replace(/[^a-z0-9_-]/gi, '-');
    if (hostId === DEFAULT_RESOURCE_HOST_ID) return `onlyoffice-editor-${safeResourceId}`;
    const safeHostId = hostId.replace(/[^a-z0-9_-]/gi, '-');
    return `onlyoffice-editor-${safeHostId}-${safeResourceId}`;
  }, [hostId, resourceId]);

  return (
    <div className={styles.editorHost}>
      <DocumentEditor
        id={containerId}
        documentServerUrl={documentServerUrl}
        config={config}
        width="100%"
        height="100%"
        events_onDocumentReady={onReady}
        events_onError={(event) =>
          onError(
            createClientError(
              FRONTEND_CLIENT_ERROR.OFFICE_LOAD_FAILED,
              { errorCode: 'unknown' },
              event
            )
          )
        }
        onLoadComponentError={(errorCode, errorDescription) => {
          onError(
            createClientError(FRONTEND_CLIENT_ERROR.OFFICE_LOAD_FAILED, {
              errorCode,
              errorDescription,
            })
          );
        }}
      />
    </div>
  );
}

function OfficeView({ resourceId }: OfficeViewProps = {}) {
  const documentService = useDocumentService();
  const interactService = useInteractService();
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<unknown>(null);

  const {
    data,
    error,
    loading: isConfigLoading,
    mutate: mutateOfficeData,
    refresh: refreshOfficeData,
  } = useRequest(
    async () => {
      const [docInfo, editorConfig] = await Promise.all([
        documentService.getDocInfo(resourceId as string),
        documentService.getOnlyOfficeEditorConfig(resourceId as string),
      ]);
      return { docInfo, editorConfig };
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
      onBefore: () => {
        setEditorReady(false);
        setEditorError(null);
      },
    }
  );

  useRequest(() => interactService.recordResourceRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
    setEditorError(null);
  }, []);

  const handleEditorError = useCallback((nextError: unknown) => {
    setEditorError(nextError);
    setEditorReady(false);
  }, []);

  const refreshResourceInfo = useCallback(async () => {
    const docInfo = await documentService.getDocInfo(resourceId as string);
    if (data) mutateOfficeData({ ...data, docInfo });
  }, [data, documentService, mutateOfficeData, resourceId]);

  if (!resourceId) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开 Office 文档"
              extra={
                <Link to="/app/drive/personal">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (error) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="ONLYOFFICE 编辑器加载失败"
              subTitle={parseErrorMessage(error)}
              extra={
                <Link to="/app/drive/personal">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (isConfigLoading && !data) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在加载 Office 文档...</span>
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (!data?.editorConfig.config) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState status="warning" title="ONLYOFFICE 编辑器配置为空" />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  return (
    <OfficeLayoutConfig
      resourceInfo={data.docInfo.resourceInfo}
      onPermissionSuccess={refreshOfficeData}
      onResourceChanged={refreshResourceInfo}
    >
      <div className={styles.content}>
        <OfficeEditorHost
          key={`${resourceId}-${data.editorConfig.sessionId ?? 'session'}`}
          config={data.editorConfig.config}
          documentServerUrl={ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL}
          resourceId={resourceId}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
        {(!editorReady || Boolean(editorError)) && (
          <div className={styles.loadingOverlay} aria-busy={!editorError} aria-live="polite">
            {editorError ? (
              <div className={styles.middleOverlayInner}>
                <ResultState
                  status="warning"
                  title="ONLYOFFICE 编辑器加载失败"
                  subTitle={parseErrorMessage(editorError)}
                />
              </div>
            ) : (
              <div className={styles.middleOverlayLoading}>
                <Spin size="large" />
                <span className={styles.middleOverlayText}>正在启动 ONLYOFFICE 编辑器...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </OfficeLayoutConfig>
  );
}

export default OfficeView;
