import React, { useRef } from 'react';
import { useMount } from 'ahooks';
import { PDFViewer as EmbedPdfViewer } from '@embedpdf/react-pdf-viewer';
import clsx from 'clsx';
import { baseURL } from '@/utils/Axios';
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
}

interface PdfViewerHandle {
  registry: Promise<{
    getPlugin(name: string): { provides(): DocumentManagerApi } | undefined;
  }>;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ resourceId, config, className }) => {
  const viewerRef = useRef<PdfViewerHandle | null>(null);

  const loadDocument = async () => {
    if (!resourceId || !viewerRef.current) return;

    try {
      const registry = await viewerRef.current.registry;
      const docManager = registry.getPlugin('document-manager')?.provides();
      await docManager?.openDocumentUrl({
        url: `${baseURL}document/getDocPreview?resourceId=${resourceId}`,
        documentId: `doc-${resourceId}`,
        mode: 'range-request',
        requestOptions: {
          credentials: 'include',
        },
        permissions: {
          canPrint: false,
          canCopy: true,
        },
      });
    } catch (error) {
      console.error('[PdfViewer] 文档加载失败:', error);
    }
  };

  useMount(() => {
    void loadDocument();
  });

  return (
    <EmbedPdfViewer
      ref={viewerRef as React.RefObject<never>}
      config={config ?? DEFAULT_PDF_VIEWER_CONFIG}
      className={clsx(styles.viewer, className)}
    />
  );
};

export default PdfViewer;
