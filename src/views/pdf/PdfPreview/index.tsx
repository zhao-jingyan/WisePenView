import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import rvhStyles from '@/components/Common/ResourceViewerHeader/style.module.less';
import PdfViewer from '@/components/Pdf/PdfViewer/index';
import { useDocumentService } from '@/domains';
import { RESOURCE_TYPE } from '@/domains/Resource/enum';
import { parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import { Button, Result, Spin } from 'antd';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './style.module.less';

function PdfPreview() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
  } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const currentResourceId = resourceId ?? '';
  const viewerError = viewerErrorMap[currentResourceId];
  const handleViewerLoadError = useCallback(
    (error: unknown) => {
      if (!currentResourceId) {
        return;
      }
      setViewerErrorMap((prev) => ({
        ...prev,
        [currentResourceId]: error,
      }));
    },
    [currentResourceId]
  );

  if (!resourceId) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (docInfoError) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                subTitle={parseErrorMessage(docInfoError)}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isDocInfoLoading) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在加载文档信息...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!docInfo) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                subTitle="文档信息为空，请稍后重试"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewerError) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader
          inlineTitle={
            <IconText
              className={rvhStyles.inlineTitleText}
              icon={
                <EntryIcon
                  entryType="resource"
                  resourceType={docInfo.resourceInfo.resourceType ?? RESOURCE_TYPE.FILE}
                />
              }
              iconSize={18}
              gap="var(--ant-margin-sm)"
              ellipsis
            >
              {docInfo.resourceInfo.resourceName}
            </IconText>
          }
        />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="文档预览失败"
                subTitle={parseErrorMessage(viewerError)}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ResourceViewerHeader
        inlineTitle={
          <IconText
            className={rvhStyles.inlineTitleText}
            icon={
              <EntryIcon
                entryType="resource"
                resourceType={docInfo.resourceInfo.resourceType ?? RESOURCE_TYPE.FILE}
              />
            }
            iconSize={18}
            gap="var(--ant-margin-sm)"
            ellipsis
          >
            {docInfo.resourceInfo.resourceName}
          </IconText>
        }
      />
      <div className={styles.content}>
        <div className={styles.root}>
          <PdfViewer key={resourceId} resourceId={resourceId} onLoadError={handleViewerLoadError} />
        </div>
      </div>
    </div>
  );
}

export default PdfPreview;
