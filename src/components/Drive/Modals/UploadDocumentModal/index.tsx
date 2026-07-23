import { useDriveUploadQueueStore } from '@/components/Drive/_store/useDriveUploadQueueStore';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useDocumentService } from '@/domains';
import type { DocumentProcessStatus } from '@/domains/Document';
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_PROCESS,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { DRIVE_UPLOAD_QUEUE_PATH } from '@/utils/navigation/driveRoute';
import { parseExtension } from '@/utils/parser/extensionParser';
import { createUuid } from '@/utils/random/createUuid';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.less';
import type { UploadDocumentModalProps } from './index.type';

const DOCUMENT_ALLOWED_EXTENSION_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);
const ACCEPT_DOCUMENT_TYPES = DOCUMENT_ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(
  ','
);

const UPLOAD_STATUS_SYNC_DELAY_MS = 3000;
const QUEUE_DONE_VISIBLE_DELAY_MS = 900;
const PROCESS_STATUS_SYNC_INTERVAL_MS = 2000;
const PROCESS_STATUS_SYNC_MAX_ATTEMPTS = 15;

/** 文档上传：MD5 -> init -> OSS PUT；后端注册成功后保存在个人根目录。 */
function UploadDocumentModal({ isOpen, onOpenChange, onSuccess }: UploadDocumentModalProps) {
  const navigate = useNavigate();
  const documentService = useDocumentService();
  const startUploads = useDriveUploadQueueStore((s) => s.startUploads);
  const updateQueuedUpload = useDriveUploadQueueStore((s) => s.updateUpload);
  const removeQueuedUpload = useDriveUploadQueueStore((s) => s.removeUpload);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const resetState = () => {
    setSelectedFiles([]);
  };

  const handleFilesChange = (files: File[]) => {
    const supportedFiles = files.filter(isSupportedDocument);
    if (supportedFiles.length !== files.length) {
      toast.warning('不支持的文件类型，仅支持 PDF 和 Office 文档');
    }
    setSelectedFiles(supportedFiles);
  };

  const completeQueuedUpload = (uploadId: string) => {
    updateQueuedUpload(uploadId, {
      phase: 'done',
    });
    window.setTimeout(() => {
      removeQueuedUpload(uploadId);
    }, QUEUE_DONE_VISIBLE_DELAY_MS);
  };

  const settleQueuedUpload = (uploadId: string, documentStatus: DocumentProcessStatus) => {
    if (documentStatus.status === DOCUMENT_PROCESS.READY) {
      completeQueuedUpload(uploadId);
      onSuccess?.();
      return;
    }
    updateQueuedUpload(uploadId, {
      phase: 'failed',
      errorMessage: documentStatus.errorMessage ?? DOCUMENT_PROCESS.getLabel(documentStatus.status),
    });
  };

  const waitForDocumentTerminalStatus = async (
    documentId: string
  ): Promise<DocumentProcessStatus | null> => {
    for (let attempt = 1; attempt <= PROCESS_STATUS_SYNC_MAX_ATTEMPTS; attempt += 1) {
      const documentStatus = await documentService.syncPendingDocStatus(documentId);
      if (isDocumentTerminalStatus(documentStatus.status)) {
        return documentStatus;
      }
      if (attempt < PROCESS_STATUS_SYNC_MAX_ATTEMPTS) {
        await delay(PROCESS_STATUS_SYNC_INTERVAL_MS);
      }
    }
    return null;
  };

  const settleUploadedDocument = async (documentId: string, uploadId: string) => {
    const documentStatus = await waitForDocumentTerminalStatus(documentId);
    if (documentStatus == null) {
      removeQueuedUpload(uploadId);
      toast.warning('文件已上传，处理仍在进行，请稍后查看上传队列');
      return;
    }
    settleQueuedUpload(uploadId, documentStatus);
  };

  const scheduleUploadSettlement = (documentId: string, uploadId: string) => {
    window.setTimeout(() => {
      void settleUploadedDocument(documentId, uploadId).catch((err: unknown) => {
        removeQueuedUpload(uploadId);
        toast.warning(`文件已上传，但未能确认处理状态：${parseErrorMessage(err)}`);
      });
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const { run: submitUpload } = useRequest(
    async (files: File[]) => {
      if (files.length === 0) return 0;
      const uploadIds = files.map(() => createUuid());

      startUploads(
        files.map((file, index) => ({
          id: uploadIds[index],
          filename: file.name,
          fileType: getDisplayFileType(file),
          size: file.size,
          phase: 'hashing',
          progress: 0,
        }))
      );

      await Promise.all(
        files.map(async (file, index) => {
          const uploadId = uploadIds[index];
          try {
            const result = await documentService.uploadDocument({
              file,
              onUploadInitialized: (payload) => {
                updateQueuedUpload(uploadId, {
                  documentId: payload.documentId,
                  phase: payload.flashUploaded ? 'confirming' : 'uploading',
                  progress: 0,
                });
              },
              onUploadProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'uploading',
                  progress: p,
                });
              },
            });
            updateQueuedUpload(uploadId, {
              documentId: result,
              phase: 'confirming',
            });
            scheduleUploadSettlement(result, uploadId);
          } catch (err) {
            updateQueuedUpload(uploadId, {
              phase: 'failed',
              errorMessage: parseErrorMessage(err),
            });
            throw err;
          }
        })
      );

      return files.length;
    },
    {
      manual: true,
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleOk = () => {
    if (selectedFiles.length === 0) {
      toast.warning('请选择要上传的文件');
      return;
    }
    const filesToUpload = selectedFiles;
    submitUpload(filesToUpload);
    toast.success(`已添加 ${filesToUpload.length} 个文件到上传队列`);
    resetState();
    onOpenChange(false);
    navigate(DRIVE_UPLOAD_QUEUE_PATH);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="上传文档"
      description="文件将上传到个人云盘根目录，并同步显示在上传队列"
      size="lg"
      containerClassName={styles.container}
      dialogClassName={styles.dialog}
      bodyClassName={styles.body}
      actions={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <X size={14} strokeWidth={1.8} />
            取消
          </Button>
          <Button variant="primary" isDisabled={selectedFiles.length === 0} onPress={handleOk}>
            <CloudUpload size={15} strokeWidth={1.8} />
            添加到上传队列
          </Button>
        </>
      }
    >
      <UploadZone
        files={selectedFiles}
        multiple
        accept={ACCEPT_DOCUMENT_TYPES}
        label="点击或拖拽文档到此区域"
        description="支持一次选择多个文档，也可以逐个添加"
        onFilesChange={handleFilesChange}
      />

      <div className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <div className={styles.statusTitle}>
            <span>支持 PDF 和 OFFICE 文档，单文件最大 100MB。</span>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function getDisplayFileType(file: File): string {
  try {
    return parseExtension(file.name);
  } catch {
    return 'unknown';
  }
}

function isSupportedDocument(file: File): boolean {
  try {
    return DOCUMENT_ALLOWED_EXTENSION_SET.has(parseExtension(file.name));
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default UploadDocumentModal;
