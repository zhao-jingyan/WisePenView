export interface UploadFileToGroupModalProps {
  open: boolean;
  onCancel: () => void;
  /** 当前小组 ID（第二步小组树与 updateResourceTags） */
  groupId: string;
  /** 全部成功后回调（例如刷新小组盘） */
  onSuccess?: () => void;
}
