/** 文档末尾互动区（Note 与 PDF 详情页通用）：大圆形点赞按钮 + 星级评分 */
import ResourceLikeButton from '@/components/Resource/ResourceLikeButton';
import ResourceRating from '@/components/Resource/ResourceRating';
import type { ResourceInteractFooterProps } from './index.type';
import styles from './style.module.less';

function ResourceInteractFooter({ resourceId, onRateSuccess }: ResourceInteractFooterProps) {
  return (
    <div className={styles.footer}>
      <ResourceLikeButton resourceId={resourceId} />
      <ResourceRating resourceId={resourceId} onRateSuccess={onRateSuccess} />
    </div>
  );
}

export default ResourceInteractFooter;
