import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { RiArrowLeftLine } from 'react-icons/ri';
import { RiFileTextLine } from 'react-icons/ri';
import PdfViewer from '@/components/Pdf/PdfViewer/index';
import { useDocumentService } from '@/contexts/ServicesContext';
import styles from './style.module.less';

const PdfPreview: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const documentService = useDocumentService();
  const { data: docInfo } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.root}>
          <header className={styles.pageHeader}>
            <div className={styles.headerMain}>
              <Link to="/app/drive" className={styles.backLink}>
                <RiArrowLeftLine size={18} aria-hidden />
                <span>返回云盘</span>
              </Link>
              <RiFileTextLine />
              <span> {docInfo?.resourceInfo.resourceName} </span>
            </div>
          </header>
          {resourceId ? <PdfViewer key={resourceId} resourceId={resourceId} /> : null}
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;
