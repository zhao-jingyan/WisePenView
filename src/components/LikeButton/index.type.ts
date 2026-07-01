export interface LikeButtonProps {
  /** 当前点赞状态 */
  liked: boolean;
  onClick?: () => void;
  disabled?: boolean;
}
