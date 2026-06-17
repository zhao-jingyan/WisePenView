import UploadZone from '@/components/UploadZone';
import { useRequest } from 'ahooks';
import { useState } from 'react';

import { useDocumentService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { CloudUpload, LoaderCircle, X } from 'lucide-react';

import styles from './UploadDocumentModal.module.less';

export interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

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

type UploadPhase = 'idle' | 'hash' | 'upload';

/** 文档上传：MD5 -> init -> OSS PUT，成功后由调用方决定后续跳转。 */
export function UploadDocumentModal({ isOpen, onOpenChange, onSuccess }: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, number>>({});

  const phaseLabel =
    phase === 'hash' ? '正在计算文件校验值' : phase === 'upload' ? '正在上传至存储' : '等待上传';
  const resetState = () => {
    setSelectedFiles([]);
    setPhase('idle');
    setFileProgressMap({});
  };

  const { loading: uploading, run: submitUpload } = useRequest(
    async (files: File[]) => {
      if (files.length === 0) return;
      const updateProgress = (index: number, value: number) => {
        const fileKey = getUploadFileKey(files[index]);
        setFileProgressMap((current) => ({
          ...current,
          [fileKey]: uploadingPercent(value),
        }));
      };

      setFileProgressMap(Object.fromEntries(files.map((file) => [getUploadFileKey(file), 0])));

      await Promise.all(
        files.map((file, index) =>
          documentService.uploadDocument({
            file,
            onHashProgress: (p) => {
              setPhase('hash');
              updateProgress(index, p * 0.2);
            },
            onUploadProgress: (p) => {
              setPhase('upload');
              updateProgress(index, 20 + p * 0.8);
            },
          })
        )
      );
    },
    {
      manual: true,
      onBefore: () => {
        setPhase('hash');
      },
      onSuccess: () => {
        toast.success(`已上传 ${selectedFiles.length} 个文件`);
        onSuccess?.();
        resetState();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setPhase('idle');
      },
    }
  );

  const handleClose = () => {
    if (uploading) return;
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
    if (uploading) return;
    if (selectedFiles.length === 0) {
      toast.warning('请选择要上传的文件');
      return;
    }
    submitUpload(selectedFiles);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!uploading}>
        <Modal.Container size="lg" placement="center" className={styles.container}>
          <Modal.Dialog className={styles.dialog}>
            <Modal.Header className={styles.header}>
              <div className={styles.titleRow}>
                <div>
                  <Modal.Heading>上传文档</Modal.Heading>
                  <div className={styles.subtitle}>上传完成后会同步刷新上传队列</div>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className={styles.body}>
              <UploadZone
                files={selectedFiles}
                multiple
                disabled={uploading}
                accept={ACCEPT_DOCUMENT_TYPES}
                label="点击或拖拽文档到此区域"
                description="支持一次选择多个文档，也可以逐个添加"
                onFilesChange={setSelectedFiles}
                getFileProgress={(file) =>
                  uploading ? fileProgressMap[getUploadFileKey(file)] : undefined
                }
              />

              <div className={styles.statusPanel} data-active={uploading}>
                <div className={styles.statusHeader}>
                  <div className={styles.statusTitle}>
                    {uploading && (
                      <LoaderCircle className={styles.spinIcon} size={16} strokeWidth={1.8} />
                    )}
                    <span>
                      {uploading
                        ? phaseLabel
                        : '支持 PDF、Office、文本和 Markdown 文档，单文件最大 100MB。'}
                    </span>
                  </div>
                  {uploading && (
                    <span className={styles.statusValue}>{selectedFiles.length} 个文件</span>
                  )}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className={styles.footer}>
              <Button variant="secondary" isDisabled={uploading} onPress={handleClose}>
                <X size={14} strokeWidth={1.8} />
                取消
              </Button>
              <Button
                variant="primary"
                isDisabled={selectedFiles.length === 0 || uploading}
                onPress={handleOk}
              >
                <CloudUpload size={15} strokeWidth={1.8} />
                开始上传
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function uploadingPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getUploadFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
