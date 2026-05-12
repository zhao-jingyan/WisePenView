import type { GroupFileOrgLogic } from '@/domains/Group';

export interface UploadFileToGroupModalProps {
  open: boolean;
  onCancel: () => void;
  /** 当前小组 ID（第二步小组树与 updateResourceTags） */
  groupId: string;
  /** 与小组盘一致：文件夹组织用 folder 树，标签组织用 tag 树（TreeNav 据此选用 Folder/Tag Service） */
  fileOrgLogic: GroupFileOrgLogic;
  /** 全部成功后回调（例如刷新小组盘） */
  onSuccess?: () => void;
}
