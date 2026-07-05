export interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** 上传到当前目录时传入；上传完成后挂载到该 tag */
  targetTagId?: string;
  groupId?: string;
}
