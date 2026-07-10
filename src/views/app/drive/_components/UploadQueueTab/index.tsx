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
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import styles from './style.module.less';

const REFRESH_INTERVAL_MS = 5000;
const PROGRESS_TICK_INTERVAL_MS = 500;
const COMPLETED_ROW_VISIBLE_DELAY_MS = 900;
const PROCESSING_PROGRESS_START = 40;
const PROCESSING_PROGRESS_LIMIT = 96;
const PROCESSING_PROGRESS_DURATION_MS = 12000;

const PROCESSING_STATUS_PROGRESS_START: Record<string, number> = {
  [DOCUMENT_PROCESS.UPLOADING]: 24,
  [DOCUMENT_PROCESS.UPLOADED]: PROCESSING_PROGRESS_START,
  [DOCUMENT_PROCESS.CONVERTING_AND_PARSING]: 56,
  [DOCUMENT_PROCESS.REGISTERING_RES]: 84,
};

const formatFileType = (fileType: string): string => {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
};

type UploadProgressColor = 'accent' | 'warning' | 'danger';

type PendingProgressAnchor = {
  status: string;
  startedAt: number;
  baseProgress: number;
};

type UploadQueueRow = {
  source: 'local' | 'pending' | 'completed';
  queueRowKey: string;
  documentId?: string;
  uploadMeta: {
    documentName: string;
    uploaderId: string | null;
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
  const latestPendingListRef = useRef<PendingDocItem[]>([]);
  const canceledDocumentIdsRef = useRef<Set<string>>(new Set());
  const [list, setList] = useState<PendingDocItem[]>([]);
  const [completedRows, setCompletedRows] = useState<UploadQueueRow[]>([]);
  const [displayNow, setDisplayNow] = useState(() => Date.now());
  const [progressAnchorsByKey, setProgressAnchorsByKey] = useState<
    Record<string, PendingProgressAnchor>
  >({});
  const [pollingActive, setPollingActive] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const hasActiveLocalUploads = useMemo(
    () => localUploads.some(isActiveLocalUpload),
    [localUploads]
  );

  const enqueueCompletedRows = (rows: UploadQueueRow[]) => {
    setCompletedRows((prev) => [
      ...prev.filter((row) => rows.every((nextRow) => nextRow.queueRowKey !== row.queueRowKey)),
      ...rows,
    ]);

    const rowKeys = new Set(rows.map((row) => row.queueRowKey));
    window.setTimeout(() => {
      setCompletedRows((prev) => prev.filter((row) => !rowKeys.has(row.queueRowKey)));
    }, COMPLETED_ROW_VISIBLE_DELAY_MS);
  };

  const {
    run: runFetchPendingList,
    loading: listLoading,
    cancel: cancelPolling,
  } = useRequest(async () => documentService.listPendingDocs(), {
    manual: true,
    onSuccess: (nextList) => {
      const now = Date.now();
      const completed = buildCompletedRowsFromDisappearedPendingRows(
        latestPendingListRef.current,
        nextList,
        canceledDocumentIdsRef.current
      );
      latestPendingListRef.current = nextList;
      setList(nextList);
      if (completed.length > 0) {
        enqueueCompletedRows(completed);
      }
      setDisplayNow(now);
      setProgressAnchorsByKey((prev) => buildNextPendingProgressAnchors(prev, nextList, now));
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
      onSuccess: (documentId) => {
        canceledDocumentIdsRef.current.add(documentId);
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
      source: 'pending' as const,
      queueRowKey: getPendingQueueRowKey(item, index),
      localUpload:
        item.documentId != null && item.documentId !== ''
          ? localUploadByDocumentId.get(item.documentId)
          : undefined,
    }));

    const activeRowKeys = new Set([...localRows, ...pendingRows].map((row) => row.queueRowKey));
    const visibleCompletedRows = completedRows.filter((row) => !activeRowKeys.has(row.queueRowKey));

    return [...visibleCompletedRows, ...localRows, ...pendingRows];
  }, [completedRows, list, localUploads]);

  const hasAnimatedProgress = useMemo(() => items.some(isAnimatedUploadQueueRow), [items]);

  useInterval(
    () => {
      setDisplayNow(Date.now());
    },
    hasAnimatedProgress ? PROGRESS_TICK_INTERVAL_MS : undefined
  );

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
        label: '进度',
        width: 'lg',
        renderCell: (row) => (
          <UploadProgressCell
            row={row}
            now={displayNow}
            progressAnchor={progressAnchorsByKey[row.queueRowKey]}
          />
        ),
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
    [
      retryingId,
      cancelingId,
      runRetryPendingDoc,
      runCancelPendingDoc,
      displayNow,
      progressAnchorsByKey,
    ]
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

function UploadProgressCell({
  row,
  now,
  progressAnchor,
}: {
  row: UploadQueueRow;
  now: number;
  progressAnchor?: PendingProgressAnchor;
}) {
  const progress = resolveRowUploadProgress(row, now, progressAnchor);
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
        aria-label={`${row.uploadMeta.documentName || '未命名文档'} 处理进度`}
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
    source: 'local',
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

function resolveRowUploadProgress(
  row: UploadQueueRow,
  now: number,
  progressAnchor?: PendingProgressAnchor
): number {
  if (row.source === 'completed') {
    return 100;
  }

  const status = row.documentStatus.status;
  if (row.localUpload?.phase === 'failed') {
    return clampProgress(row.localUpload.progress);
  }

  if (status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT) {
    return 0;
  }

  if (isDocumentTerminalStatus(status)) {
    return 100;
  }

  if (row.localUpload?.phase === 'done' && row.source === 'pending') {
    return resolveBackendProcessingProgress(status, now, progressAnchor);
  }

  if (row.localUpload != null) {
    return resolveLocalUploadProgress(row.localUpload, now);
  }

  if (isAnimatedDocumentStatus(status)) {
    return resolveBackendProcessingProgress(status, now, progressAnchor);
  }

  return 100;
}

function resolveRowUploadProgressLabel(row: UploadQueueRow): string {
  if (row.source === 'completed') {
    return '处理完成';
  }

  const status = row.documentStatus.status;
  if (
    status === DOCUMENT_PROCESS.FAILED ||
    status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT ||
    status === DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT
  ) {
    return DOCUMENT_PROCESS.getLabel(status);
  }

  const localUpload = row.localUpload;
  if (
    localUpload?.phase === 'done' &&
    row.source === 'pending' &&
    isAnimatedDocumentStatus(status)
  ) {
    return resolveAnimatedDocumentStatusLabel(status);
  }

  if (localUpload != null) {
    if (localUpload.phase === 'hashing') return '计算校验值';
    if (localUpload.phase === 'uploading') return '上传中';
    if (localUpload.phase === 'confirming') return '处理中';
    if (localUpload.phase === 'done') return '上传完成';
    return localUpload.errorMessage ?? '上传失败';
  }

  if (isAnimatedDocumentStatus(status)) {
    return resolveAnimatedDocumentStatusLabel(status);
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

function getPendingQueueRowKey(item: PendingDocItem, index: number): string {
  return (
    item.documentId ??
    `${item.uploadMeta.documentName}-${item.uploadMeta.uploaderId ?? 'unknown'}-${String(index)}`
  );
}

function buildNextPendingProgressAnchors(
  prev: Record<string, PendingProgressAnchor>,
  items: PendingDocItem[],
  now: number
): Record<string, PendingProgressAnchor> {
  const next: Record<string, PendingProgressAnchor> = {};

  items.forEach((item, index) => {
    const status = item.documentStatus.status;
    if (!isAnimatedDocumentStatus(status)) return;

    const key = getPendingQueueRowKey(item, index);
    const prevAnchor = prev[key];
    if (prevAnchor?.status === status) {
      next[key] = prevAnchor;
      return;
    }

    const prevProgress =
      prevAnchor == null
        ? undefined
        : resolveTimedProgress(
            prevAnchor.baseProgress,
            PROCESSING_PROGRESS_LIMIT,
            prevAnchor.startedAt,
            now,
            PROCESSING_PROGRESS_DURATION_MS
          );

    next[key] = {
      status,
      startedAt: now,
      baseProgress: Math.max(getProcessingStatusProgressStart(status), prevProgress ?? 0),
    };
  });

  return next;
}

function buildCompletedRowsFromDisappearedPendingRows(
  prevItems: PendingDocItem[],
  nextItems: PendingDocItem[],
  canceledDocumentIds: Set<string>
): UploadQueueRow[] {
  const nextKeys = new Set(nextItems.map(getPendingQueueRowKey));

  return prevItems.flatMap((item, index) => {
    const status = item.documentStatus.status;
    const key = getPendingQueueRowKey(item, index);
    if (item.documentId != null && canceledDocumentIds.has(item.documentId)) {
      canceledDocumentIds.delete(item.documentId);
      return [];
    }
    if (nextKeys.has(key) || !isCompletableDocumentStatus(status)) {
      return [];
    }
    return [mapPendingItemToCompletedRow(item, index)];
  });
}

function mapPendingItemToCompletedRow(item: PendingDocItem, index: number): UploadQueueRow {
  return {
    ...item,
    source: 'completed',
    queueRowKey: getPendingQueueRowKey(item, index),
    documentStatus: {
      status: DOCUMENT_PROCESS.READY,
    },
  };
}

function isAnimatedUploadQueueRow(row: UploadQueueRow): boolean {
  if (row.source === 'completed') return false;
  if (row.localUpload?.phase === 'confirming') return true;
  if (row.localUpload != null && row.localUpload.phase !== 'done') return false;
  return isAnimatedDocumentStatus(row.documentStatus.status);
}

function isAnimatedDocumentStatus(status: string): boolean {
  return PROCESSING_STATUS_PROGRESS_START[status] != null;
}

function isCompletableDocumentStatus(status: string): boolean {
  return isAnimatedDocumentStatus(status) || status === DOCUMENT_PROCESS.READY;
}

function resolveAnimatedDocumentStatusLabel(status: string): string {
  if (status === DOCUMENT_PROCESS.UPLOADING) return '上传中';
  if (status === DOCUMENT_PROCESS.REGISTERING_RES) return DOCUMENT_PROCESS.getLabel(status);
  return '处理中';
}

function resolveLocalUploadProgress(upload: DriveUploadQueueItem, now: number): number {
  if (upload.phase === 'confirming') {
    return resolveTimedProgress(
      Math.max(clampProgress(upload.progress), PROCESSING_PROGRESS_START),
      PROCESSING_PROGRESS_LIMIT,
      upload.phaseStartedAt ?? upload.updatedAt ?? now,
      now,
      PROCESSING_PROGRESS_DURATION_MS
    );
  }

  if (upload.phase === 'done') return 100;
  return clampProgress(upload.progress);
}

function resolveBackendProcessingProgress(
  status: string,
  now: number,
  progressAnchor?: PendingProgressAnchor
): number {
  const statusStart = getProcessingStatusProgressStart(status);
  const baseProgress = Math.max(progressAnchor?.baseProgress ?? statusStart, statusStart);
  return resolveTimedProgress(
    baseProgress,
    PROCESSING_PROGRESS_LIMIT,
    progressAnchor?.startedAt ?? now,
    now,
    PROCESSING_PROGRESS_DURATION_MS
  );
}

function getProcessingStatusProgressStart(status: string): number {
  return PROCESSING_STATUS_PROGRESS_START[status] ?? PROCESSING_PROGRESS_START;
}

function resolveTimedProgress(
  start: number,
  limit: number,
  startedAt: number,
  now: number,
  duration: number
): number {
  const safeStart = Math.min(clampProgress(start), limit);
  const elapsed = Math.max(0, now - startedAt);
  const ratio = Math.min(1, elapsed / duration);
  const easedRatio = 1 - (1 - ratio) ** 2;
  return clampProgress(safeStart + (limit - safeStart) * easedRatio);
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default UploadQueueTab;
