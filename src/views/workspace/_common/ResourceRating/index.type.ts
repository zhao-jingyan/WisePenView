export interface ResourceRatingProps {
  /** 资源 ID */
  resourceId: string;
  /** 评分提交成功后的额外回调（如刷新均分展示） */
  onRateSuccess?: () => void;
}
