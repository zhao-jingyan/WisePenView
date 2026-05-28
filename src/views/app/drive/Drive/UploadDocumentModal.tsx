import { useRequest } from 'ahooks';
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AiOutlineInbox } from 'react-icons/ai';

import { useDocumentService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, Modal, ProgressBar, toast } from '@heroui/react';

import styles from './UploadDocumentModal.module.less';

export interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** 文档上传：MD5 -> init -> OSS PUT，成功后由调用方决定后续跳转。 */
export function UploadDocumentModal({ isOpen, onOpenChange, onSuccess }: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'hash' | 'upload'>('idle');
  const [percent, setPercent] = useState(0);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setDragActive(false);
    setPhase('idle');
    setPercent(0);
  }, []);

  const { loading: uploading, run: submitUpload } = useRequest(
    (file: File) =>
      documentService.uploadDocument({
        file,
        onHashProgress: (p) => {
          setPhase('hash');
          setPercent(p);
        },
        onUploadProgress: (p) => {
          setPhase('upload');
          setPercent(p);
        },
      }),
    {
      manual: true,
      onBefore: () => {
        setPhase('hash');
        setPercent(0);
      },
      onSuccess: () => {
        toast.success('上传成功');
        onSuccess?.();
        resetState();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setPhase('idle');
        setPercent(0);
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

  const selectFile = (files: FileList | null) => {
    if (uploading) return;
    const file = files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleOk = () => {
    if (!selectedFile) {
      toast.warning('请选择要上传的文件');
      return;
    }
    submitUpload(selectedFile);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!uploading}>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>上传文件</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className={styles.hint}>支持 pdf、Office 文档等，单文件最大 100MB。</p>
              <input
                ref={inputRef}
                className={styles.nativeInput}
                type="file"
                onChange={handleInputChange}
              />
              {selectedFile ? (
                <div className={styles.selectedFile}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName} title={selectedFile.name}>
                      {selectedFile.name}
                    </span>
                    <span className={styles.fileMeta}>{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={uploading}
                    onPress={() => inputRef.current?.click()}
                  >
                    重新选择
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.dropArea}
                  data-active={dragActive}
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <AiOutlineInbox className={styles.uploadIcon} size={44} />
                  <span className={styles.uploadText}>点击或拖拽文件到此区域</span>
                  <span className={styles.uploadHint}>仅可选择单个文件</span>
                </button>
              )}
              {uploading && (
                <div className={styles.progressWrap}>
                  <div className={styles.progressLabel}>
                    {phase === 'hash' ? '正在计算文件校验值' : '正在上传至存储'}
                  </div>
                  <ProgressBar
                    aria-label="上传进度"
                    value={percent}
                    valueLabel={`${percent}%`}
                    size="sm"
                  >
                    <ProgressBar.Track className={styles.progressTrack}>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                    <ProgressBar.Output className={styles.progressOutput} />
                  </ProgressBar>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={uploading} onPress={handleClose}>
                取消
              </Button>
              <Button variant="primary" isDisabled={!selectedFile || uploading} onPress={handleOk}>
                开始上传
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
