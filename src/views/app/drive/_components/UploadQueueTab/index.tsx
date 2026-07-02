import { DataTable, type DataTableColumn } from '@/components/Table';
import { useDocumentService } from '@/domains';
import type { PendingDocItem } from '@/domains/Document';
import {
  DOCUMENT_PROCESS,
  isDocumentCancelableStatus,
  isDocumentRetryableStatus,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { useDriveUploadQueueStore, type DriveUploadQueueItem } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, ProgressBar, toast } from '@heroui/react';
import { useInterval, useMount, useRequest, useUnmount } from 'ahooks';
import { useImperativeHandle, useMemo, useState, type Ref } from 'react';
import styles from './style.module.less';

const REFRESH_INTERVAL_MS = 5000;

const formatFileType = (fileType: string): string => {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
};

type UploadProgressColor = 'accent' | 'warning' | 'danger';

type UploadQueueRow = {
  queueRowKey: string;
  documentId?: string;
  uploadMeta: {
    documentName: string;
    uploaderId: number | null;
    fileType: string;
    size: number;
  };
  documentStatus: PendingDocItem['documentStatus'];
  maxPreviewPages: number | null;
  localUpload?: DriveUploadQueueItem;
};

export interface UploadQueueTabRef {
  refresh: () => void;
}

function UploadQueueTab({ ref }: { ref?: Ref<UploadQueueTabRef> }) {
  const documentService = useDocumentService();
  const localUploads = useDriveUploadQueueStore((s) => s.uploads);
  const [list, setList] = useState<PendingDocItem[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const hasActiveLocalUploads = useMemo(
    () => localUploads.some(isActiveLocalUpload),
    [localUploads]
  );

  const {
    run: runFetchPendingList,
    loading: listLoading,
    cancel: cancelPolling,
  } = useRequest(async () => documentService.listPendingDocs(), {
    manual: true,
    onSuccess: (nextList) => {
      setList(nextList);
      setPollingActive(
        nextList.some((item) => !isDocumentTerminalStatus(item.documentStatus.status))
      );
    },
    onError: (err) => {
      setPollingActive(false);
      toast.danger(parseErrorMessage(err));
    },
  });

  const { run: runRetryPendingDoc } = useRequest(
    async (documentId: string) => {
      await documentService.retryPendingDoc(documentId);
      return documentId;
    },
    {
      manual: true,
      onBefore: (params) => {
        setRetryingId(params[0] ?? null);
      },
      onSuccess: () => {
        toast.success('已提交重试');
        runFetchPendingList();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setRetryingId(null);
      },
    }
  );

  const { run: runCancelPendingDoc } = useRequest(
    async (documentId: string) => {
      await documentService.cancelPendingDoc(documentId);
      return documentId;
    },
    {
      manual: true,
      onBefore: (params) => {
        setCancelingId(params[0] ?? null);
      },
      onSuccess: () => {
        toast.success('已取消处理');
        runFetchPendingList();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setCancelingId(null);
      },
    }
  );

  useMount(() => {
    runFetchPendingList();
  });

  useInterval(
    () => {
      if (listLoading) return;
      runFetchPendingList();
    },
    pollingActive || hasActiveLocalUploads ? REFRESH_INTERVAL_MS : undefined
  );

  useUnmount(() => {
    cancelPolling();
  });

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        runFetchPendingList();
      },
    }),
    [runFetchPendingList]
  );

  const items = useMemo<UploadQueueRow[]>(() => {
    const pendingDocumentIds = new Set<string>();
    const localUploadByDocumentId = new Map<string, DriveUploadQueueItem>();

    localUploads.forEach((upload) => {
      if (upload.documentId != null && upload.documentId !== '') {
        localUploadByDocumentId.set(upload.documentId, upload);
      }
    });

    list.forEach((item) => {
      if (item.documentId != null && item.documentId !== '') {
        pendingDocumentIds.add(item.documentId);
      }
    });

    const localRows = localUploads
      .filter((upload) => upload.documentId == null || !pendingDocumentIds.has(upload.documentId))
      .map(mapLocalUploadToRow);

    const pendingRows = list.map((item, index) => ({
      ...item,
      queueRowKey:
        item.documentId ??
        `${item.uploadMeta.documentName}-${item.uploadMeta.uploaderId ?? 'unknown'}-${String(index)}`,
      localUpload:
        item.documentId != null && item.documentId !== ''
          ? localUploadByDocumentId.get(item.documentId)
          : undefined,
    }));

    return [...localRows, ...pendingRows];
  }, [list, localUploads]);

  const columns = useMemo<DataTableColumn<UploadQueueRow>[]>(
    () => [
      {
        id: 'filename',
        label: '文件名',
        width: 'fill',
        isRowHeader: true,
        renderCell: (row) => (
          <span className={styles.nameText}>{row.uploadMeta.documentName || '未命名文档'}</span>
        ),
      },
      {
        id: 'fileType',
        label: '类型',
        width: 'sm',
        renderCell: (row) => formatFileType(row.uploadMeta.fileType),
      },
      {
        id: 'size',
        label: '大小',
        width: 'sm',
        renderCell: (row) => formatFileSize(row.uploadMeta.size),
      },
      {
        id: 'progress',
        label: '上传进度',
        width: 'lg',
        renderCell: (row) => <UploadProgressCell row={row} />,
      },
      {
        id: 'action',
        label: '',
        width: 'md',
        align: 'end',
        renderCell: (row) => {
          const status = row.documentStatus.status;
          const hasDocumentId = row.documentId != null && row.documentId !== '';
          const retryDisabled = !hasDocumentId || !isDocumentRetryableStatus(status);
          const cancelDisabled = !hasDocumentId || !isDocumentCancelableStatus(status);
          return (
            <div className={styles.actionGroup}>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={retryDisabled || retryingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runRetryPendingDoc(row.documentId);
                }}
              >
                重试
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={cancelDisabled || cancelingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runCancelPendingDoc(row.documentId);
                }}
              >
                取消
              </Button>
            </div>
          );
        },
      },
    ],
    [retryingId, cancelingId, runRetryPendingDoc, runCancelPendingDoc]
  );

  return (
    <div className={styles.wrapper}>
      <main className={styles.listArea}>
        <DataTable<UploadQueueRow>
          ariaLabel="上传队列"
          rowKey="queueRowKey"
          items={items}
          columns={columns}
          loading={listLoading}
          emptyText="暂无上传队列"
          summary={false}
        />
      </main>
    </div>
  );
}

function UploadProgressCell({ row }: { row: UploadQueueRow }) {
  const progress = resolveRowUploadProgress(row);
  const label = resolveRowUploadProgressLabel(row);

  return (
    <div className={styles.progressCell}>
      <div className={styles.progressMeta}>
        <span className={styles.progressLabel} title={label}>
          {label}
        </span>
        <span className={styles.progressValue}>{progress}%</span>
      </div>
      <ProgressBar
        aria-label={`${row.uploadMeta.documentName || '未命名文档'} 上传进度`}
        color={resolveRowUploadProgressColor(row)}
        size="sm"
        value={progress}
      >
        <ProgressBar.Track className={styles.progressTrack}>
          <ProgressBar.Fill className={styles.progressFill} />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

function mapLocalUploadToRow(upload: DriveUploadQueueItem): UploadQueueRow {
  return {
    queueRowKey: upload.id,
    documentId: upload.documentId,
    uploadMeta: {
      documentName: upload.filename,
      uploaderId: null,
      fileType: upload.fileType,
      size: upload.size,
    },
    documentStatus: {
      status: resolveLocalUploadStatus(upload),
    },
    maxPreviewPages: null,
    localUpload: upload,
  };
}

function isActiveLocalUpload(upload: DriveUploadQueueItem): boolean {
  return (
    upload.phase === 'hashing' || upload.phase === 'uploading' || upload.phase === 'confirming'
  );
}

function resolveLocalUploadStatus(upload: DriveUploadQueueItem): string {
  if (upload.phase === 'confirming' || upload.phase === 'done') return DOCUMENT_PROCESS.UPLOADED;
  if (upload.phase === 'failed') return DOCUMENT_PROCESS.FAILED;
  return DOCUMENT_PROCESS.UPLOADING;
}

function resolveRowUploadProgress(row: UploadQueueRow): number {
  if (row.localUpload != null) {
    return clampProgress(row.localUpload.progress);
  }

  const status = row.documentStatus.status;
  if (status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT) {
    return 0;
  }
  return 100;
}

function resolveRowUploadProgressLabel(row: UploadQueueRow): string {
  const status = row.documentStatus.status;
  if (
    status === DOCUMENT_PROCESS.FAILED ||
    status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT ||
    status === DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT
  ) {
    return DOCUMENT_PROCESS.getLabel(status);
  }

  const localUpload = row.localUpload;
  if (localUpload != null) {
    if (localUpload.phase === 'hashing') return '计算校验值';
    if (localUpload.phase === 'uploading') return '上传中';
    if (localUpload.phase === 'confirming') return '处理中';
    if (localUpload.phase === 'done') return '上传完成';
    return localUpload.errorMessage ?? '上传失败';
  }

  if (status === DOCUMENT_PROCESS.UPLOADING) {
    return '处理中';
  }
  return DOCUMENT_PROCESS.getLabel(status);
}

function resolveRowUploadProgressColor(row: UploadQueueRow): UploadProgressColor {
  const status = row.documentStatus.status;
  if (
    row.localUpload?.phase === 'failed' ||
    status === DOCUMENT_PROCESS.FAILED ||
    status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT
  ) {
    return 'danger';
  }

  if (status === DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT) {
    return 'warning';
  }

  return 'accent';
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default UploadQueueTab;
