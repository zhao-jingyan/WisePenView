import { mountResourceToFolderTag } from '@/components/Drive/common/driveComponentModel';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useDocumentService, useResourceService } from '@/domains';
import { useDriveUploadQueueStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { parseExtension } from '@/utils/parser/extensionParser';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import styles from './index.module.less';
import type { UploadDocumentModalProps } from './index.type';

const ACCEPT_DOCUMENT_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
].join(',');

const UPLOAD_STATUS_SYNC_DELAY_MS = 3000;
const QUEUE_HASH_PROGRESS_WEIGHT = 0.15;
const QUEUE_UPLOAD_PROGRESS_START = 15;
const QUEUE_UPLOAD_PROGRESS_WEIGHT = 0.85;

interface SubmitUploadPayload {
  files: File[];
  mountTagId?: string;
}

/** 文档上传：MD5 -> init -> OSS PUT；可选挂载到当前文件夹 tag。 */
function UploadDocumentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  targetTagId,
  groupId,
}: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const startUploads = useDriveUploadQueueStore((s) => s.startUploads);
  const updateQueuedUpload = useDriveUploadQueueStore((s) => s.updateUpload);
  const removeQueuedUpload = useDriveUploadQueueStore((s) => s.removeUpload);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const mountsToFolder = Boolean(targetTagId?.trim());

  const resetState = () => {
    setSelectedFiles([]);
  };

  const dismissQueuedUpload = (
    uploadId: string,
    patch: { documentId?: string; objectKey?: string } = {}
  ) => {
    if (Object.keys(patch).length > 0) {
      updateQueuedUpload(uploadId, patch);
    }
    removeQueuedUpload(uploadId);
  };

  const scheduleUploadStatusSync = (documentId: string, uploadId: string) => {
    window.setTimeout(() => {
      void documentService
        .syncPendingDocStatus(documentId)
        .catch(() => undefined)
        .finally(() => {
          dismissQueuedUpload(uploadId);
        });
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const scheduleFolderMount = (documentId: string, mountTagId: string) => {
    const tagId = mountTagId.trim();
    if (!tagId) return;

    window.setTimeout(() => {
      void (async () => {
        await documentService.syncPendingDocStatus(documentId).catch(() => undefined);
        try {
          await mountResourceToFolderTag({
            resourceId: documentId,
            targetTagId: tagId,
            documentService,
            resourceService,
            groupId,
          });
          onSuccess?.();
        } catch (err) {
          toast.warning(`文件已上传，但未能放入当前文件夹：${parseErrorMessage(err)}`);
        }
      })();
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const { run: submitUpload } = useRequest(
    async ({ files, mountTagId }: SubmitUploadPayload) => {
      if (files.length === 0) return 0;
      const shouldMountToFolder = Boolean(mountTagId?.trim());
      const uploadIds = files.map(createUploadId);

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

      const uploadResults = await Promise.allSettled(
        files.map(async (file, index) => {
          const uploadId = uploadIds[index];
          try {
            const result = await documentService.uploadDocument({
              file,
              onUploadInitialized: (payload) => {
                updateQueuedUpload(uploadId, {
                  documentId: payload.documentId,
                  objectKey: payload.objectKey,
                  phase: payload.flashUploaded ? 'done' : 'uploading',
                  progress: payload.flashUploaded ? 100 : QUEUE_UPLOAD_PROGRESS_START,
                });
              },
              onHashProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'hashing',
                  progress: p * QUEUE_HASH_PROGRESS_WEIGHT,
                });
              },
              onUploadProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'uploading',
                  progress: getQueueUploadProgress(p),
                });
              },
            });
            if (result.flashUploaded) {
              dismissQueuedUpload(uploadId, {
                documentId: result.documentId,
                objectKey: result.objectKey,
              });
              if (shouldMountToFolder && mountTagId) {
                scheduleFolderMount(result.documentId, mountTagId);
              }
            } else {
              updateQueuedUpload(uploadId, {
                documentId: result.documentId,
                objectKey: result.objectKey,
                phase: 'confirming',
                progress: 100,
              });
              scheduleUploadStatusSync(result.documentId, uploadId);
              if (shouldMountToFolder && mountTagId) {
                scheduleFolderMount(result.documentId, mountTagId);
              }
            }
          } catch (err) {
            updateQueuedUpload(uploadId, {
              phase: 'failed',
              errorMessage: parseErrorMessage(err),
            });
            throw err;
          }
        })
      );

      const failedResult = uploadResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failedResult != null) {
        throw failedResult.reason;
      }
      return files.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        if (count > 0) {
          toast.success(
            mountsToFolder ? `已开始上传 ${count} 个文件到当前文件夹` : `已完成 ${count} 个文件上传`
          );
        }
      },
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
    const mountTagId = targetTagId?.trim();
    submitUpload({ files: filesToUpload, mountTagId });
    if (!mountsToFolder) {
      toast.success(`已添加 ${filesToUpload.length} 个文件到上传队列`);
    }
    resetState();
    onOpenChange(false);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="上传文档"
      description={
        mountsToFolder
          ? '文件将上传到当前文件夹，并同步显示在上传队列'
          : '上传完成后会同步刷新上传队列'
      }
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
            {mountsToFolder ? '开始上传' : '添加到上传队列'}
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
        onFilesChange={setSelectedFiles}
      />

      <div className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <div className={styles.statusTitle}>
            <span>支持 PDF、Office、文本和 Markdown 文档，单文件最大 100MB。</span>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function getQueueUploadProgress(value: number): number {
  return Math.min(100, QUEUE_UPLOAD_PROGRESS_START + value * QUEUE_UPLOAD_PROGRESS_WEIGHT);
}

function getDisplayFileType(file: File): string {
  try {
    return parseExtension(file.name);
  } catch {
    return 'unknown';
  }
}

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default UploadDocumentModal;
