export interface NewTagModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId?: string;
  /** 文案主体：默认「标签」 */
  subjectLabel?: string;
  /**
   * 父标签 tagId；虚拟根（全部标签）下不传，请求体不含 parentId
   */
  parentTagId?: string;
  /** 有父级时用于提示文案 */
  parentDisplayName?: string;
}
