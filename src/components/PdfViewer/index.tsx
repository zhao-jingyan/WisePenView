import { getApiBaseURL } from '@/apis/apiServerAddr';
import { PDFViewer as EmbedPdfViewer } from '@embedpdf/react-pdf-viewer';
import { useMount, useUnmount } from 'ahooks';
import clsx from 'clsx';
import React, { useRef } from 'react';
import type { PdfViewerProps } from './index.type';
import { DEFAULT_PDF_VIEWER_CONFIG } from './pdf.config';
import styles from './style.module.less';

interface DocumentManagerApi {
  openDocumentUrl(options: {
    url: string;
    documentId: string;
    mode?: string;
    requestOptions?: RequestInit;
    permissions?: Record<string, boolean>;
  }): Promise<void>;
  onDocumentError?(
    handler: (payload: { documentId?: string; error?: unknown }) => void
  ): (() => void) | void;
}

interface UiManagerApi {
  setActiveSidebar(
    placement: string,
    slot: string,
    sidebarId: string,
    documentId?: string,
    activeTab?: string,
    props?: Record<string, unknown>
  ): void;
}

interface PdfViewerHandle {
  registry: Promise<{
    getPlugin(name: 'document-manager'): { provides(): DocumentManagerApi } | undefined;
    getPlugin(name: 'ui'): { provides(): UiManagerApi } | undefined;
    getPlugin(name: string): { provides(): unknown } | undefined;
  }>;
}

function PdfViewer({ resourceId, config, className, onLoadError }: PdfViewerProps) {
  const viewerRef = useRef<PdfViewerHandle | null>(null);
  const onDocumentErrorCleanupRef = useRef<(() => void) | null>(null);

  const loadDocument = async () => {
    if (!resourceId || !viewerRef.current) return;

    try {
      const registry = await viewerRef.current.registry;
      const docManager = registry.getPlugin('document-manager')?.provides();
      if (!docManager) {
        const err = new Error('PDF 文档管理器不可用');
        onLoadError?.(err);
        return;
      }
      if (onDocumentErrorCleanupRef.current === null) {
        const cleanup = docManager.onDocumentError?.(({ error }) => {
          console.error('[PdfViewer] 文档事件错误:', error);
          onLoadError?.(error ?? new Error('文档加载失败'));
        });
        if (typeof cleanup === 'function') {
          onDocumentErrorCleanupRef.current = cleanup;
        }
      }
      const documentId = `doc-${resourceId}`;
      await docManager?.openDocumentUrl({
        url: `${getApiBaseURL()}document/getDocPreview?resourceId=${resourceId}`,
        documentId,
        mode: 'range-request',
        requestOptions: {
          credentials: 'include',
        },
        permissions: {
          canPrint: false,
          canCopy: false,
        },
      });

      // 默认打开左侧缩略图栏，贴近飞书式 PDF 阅读布局。
      registry
        .getPlugin('ui')
        ?.provides()
        .setActiveSidebar('left', 'main', 'sidebar-panel', documentId, 'thumbnails');
    } catch (error) {
      console.error('[PdfViewer] 文档加载失败:', error);
      onLoadError?.(error);
    }
  };

  useMount(() => {
    void loadDocument();
  });

  useUnmount(() => {
    if (onDocumentErrorCleanupRef.current) {
      onDocumentErrorCleanupRef.current();
      onDocumentErrorCleanupRef.current = null;
    }
  });

  return (
    <EmbedPdfViewer
      ref={viewerRef as React.RefObject<never>}
      config={config ?? DEFAULT_PDF_VIEWER_CONFIG}
      className={clsx(styles.viewer, className)}
    />
  );
}

export default PdfViewer;
