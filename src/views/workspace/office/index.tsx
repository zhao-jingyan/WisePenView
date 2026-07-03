import { getApiServerAddr } from '@/apis/apiServerAddr';
import EntryIcon from '@/components/EntryIcon';
import { ResultState, Spin } from '@/components/Feedback';
import IconText from '@/components/IconText';
import { useDocumentService, useResourceService } from '@/domains';
import type { OnlyOfficeEditorConfigResponse } from '@/domains/Document';
import { RESOURCE_TYPE } from '@/domains/Resource';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import { Button } from '@heroui/react';
import type { Config } from '@onlyoffice/doceditor-types';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './style.module.less';

interface OfficeToolbarTitleProps {
  resourceName: string;
  resourceType?: string;
}

interface OfficeLayoutConfigProps {
  children: ReactNode;
  resourceName?: string;
  resourceType?: string;
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

function normalizeServerUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '');
}

function readCurrentServerOnlyOfficeUrl(): string {
  let hostname = window.location.hostname;

  try {
    const apiServerAddr = getApiServerAddr();
    if (apiServerAddr?.trim()) {
      const apiServerUrl = new URL(
        apiServerAddr.includes('://')
          ? apiServerAddr
          : `${window.location.protocol}//${apiServerAddr}`
      );
      hostname = apiServerUrl.hostname;
    }
  } catch {
    // API 地址无法解析时回退到当前页面所在服务器。
  }

  const host = hostname.includes(':') ? `[${hostname}]` : hostname;
  return `${window.location.protocol}//${host}:8101`;
}

function resolveDocumentServerUrl(response: OnlyOfficeEditorConfigResponse): string {
  return (
    normalizeServerUrl(response.documentServerPublicUrl) ??
    normalizeServerUrl(import.meta.env.VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL) ??
    readCurrentServerOnlyOfficeUrl()
  );
}

function assertDocumentServerUrl(documentServerUrl: string): void {
  const normalizedUrl = normalizeServerUrl(documentServerUrl);
  if (!normalizedUrl) {
    throw new Error('ONLYOFFICE Document Server 地址为空');
  }
}

function OfficeToolbarTitle({ resourceName, resourceType }: OfficeToolbarTitleProps) {
  return (
    <IconText
      className={styles.toolbarTitleText}
      icon={<EntryIcon entryType="resource" resourceType={resourceType ?? RESOURCE_TYPE.FILE} />}
      iconSize={18}
      gap="var(--space-sm)"
      ellipsis
    >
      {resourceName}
    </IconText>
  );
}

function OfficeLayoutConfig({ children, resourceName, resourceType }: OfficeLayoutConfigProps) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      className: styles.container,
      header: resourceName
        ? {
            inlineTitle: (
              <OfficeToolbarTitle resourceName={resourceName} resourceType={resourceType} />
            ),
          }
        : {},
    }),
    [resourceName, resourceType]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function OfficeEditorHost({
  config,
  documentServerUrl,
  resourceId,
  onReady,
  onError,
}: OfficeEditorHostProps) {
  const containerId = useMemo(
    () => `onlyoffice-editor-${resourceId.replace(/[^a-z0-9_-]/gi, '-')}`,
    [resourceId]
  );

  assertDocumentServerUrl(documentServerUrl);

  return (
    <div className={styles.editorHost}>
      <DocumentEditor
        id={containerId}
        documentServerUrl={documentServerUrl}
        config={config}
        width="100%"
        height="100%"
        events_onDocumentReady={onReady}
        events_onError={(event) => onError(event)}
        onLoadComponentError={(errorCode, errorDescription) => {
          onError(new Error(`${errorDescription || 'ONLYOFFICE 组件加载失败'} (${errorCode})`));
        }}
      />
    </div>
  );
}

function OfficeView({ resourceId }: OfficeViewProps = {}) {
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<unknown>(null);

  const {
    data,
    error,
    loading: isConfigLoading,
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

  useRequest(() => resourceService.interactRead(resourceId as string), {
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

  if (!resourceId) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开 Office 文档"
              extra={
                <Link to="/app/drive">
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
                <Link to="/app/drive">
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

  const resourceName = data.docInfo.resourceInfo.resourceName;
  const resourceType = data.docInfo.resourceInfo.resourceType;
  const documentServerUrl = resolveDocumentServerUrl(data.editorConfig);

  return (
    <OfficeLayoutConfig resourceName={resourceName} resourceType={resourceType}>
      <div className={styles.content}>
        <OfficeEditorHost
          key={`${resourceId}-${data.editorConfig.sessionId ?? 'session'}`}
          config={data.editorConfig.config}
          documentServerUrl={documentServerUrl}
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
