import { useRequest } from 'ahooks';
import type { UploadFile, UploadProps } from 'antd';
import { Button, Modal, Progress, Upload } from 'antd';
import { useCallback, useState } from 'react';
import { AiOutlineInbox } from 'react-icons/ai';

import { useDocumentService } from '@/domains';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/error';

import styles from './UploadDocumentModal.module.less';

export interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/** 文档上传：MD5 -> init -> OSS PUT，成功后由调用方决定后续跳转。 */
export function UploadDocumentModal({ open, onClose, onSuccess }: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const message = useAppMessage();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [phase, setPhase] = useState<'idle' | 'hash' | 'upload'>('idle');
  const [percent, setPercent] = useState(0);

  const resetState = useCallback(() => {
    setFileList([]);
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
        message.success('上传成功');
        onSuccess?.();
        resetState();
        onClose();
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err));
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
    onClose();
  };

  const uploadProps: UploadProps = {
    maxCount: 1,
    disabled: uploading,
    beforeUpload: () => false,
    fileList,
    onChange: ({ fileList: next }) => {
      setFileList(next.slice(-1));
    },
    onRemove: () => {
      if (!uploading) setFileList([]);
    },
  };

  const handleOk = () => {
    const raw = fileList[0]?.originFileObj;
    if (!(raw instanceof File)) {
      message.warning('请选择要上传的文件');
      return;
    }
    submitUpload(raw);
  };

  return (
    <Modal
      title="上传文件"
      open={open}
      onCancel={handleClose}
      onOk={handleOk}
      okText="开始上传"
      okButtonProps={{ loading: uploading, disabled: fileList.length === 0 }}
      cancelButtonProps={{ disabled: uploading }}
      destroyOnHidden
      width={520}
    >
      <p className={styles.hint}>支持 pdf、Office 文档等，单文件最大 100MB。</p>
      {fileList.length === 0 ? (
        <Upload.Dragger {...uploadProps} className={styles.dragger}>
          <p className="ant-upload-drag-icon">
            <AiOutlineInbox size={48} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">仅可选择单个文件</p>
        </Upload.Dragger>
      ) : (
        <div className={styles.selectedFile}>
          <span className={styles.fileName} title={fileList[0].name}>
            {fileList[0].name}
          </span>
          <Button type="link" size="small" disabled={uploading} onClick={() => setFileList([])}>
            重新选择
          </Button>
        </div>
      )}
      {uploading && (
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            {phase === 'hash' ? '正在计算文件校验值' : '正在上传至存储'}
          </div>
          <Progress percent={percent} status="active" />
        </div>
      )}
    </Modal>
  );
}
