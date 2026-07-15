import Rating from '@/components/Rating';
import { formatReadCount } from '@/utils/format/formatNumber';
import { ToggleButton } from '@heroui/react';
import { Bookmark, Eye, Star, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './style.module.less';

interface ResourceFeedbackSummaryProps {
  readCount?: number | null;
  favoriteCount?: number | null;
  scoreAvg?: number | null;
  liked: boolean;
  likeCount: number;
  score: number;
  likePending: boolean;
  ratePending: boolean;
  onLikeChange(liked: boolean): void;
  onRateChange(score: number): void;
  favoriteAction: ReactNode;
}

function ResourceFeedbackSummary({
  readCount,
  favoriteCount,
  scoreAvg,
  liked,
  likeCount,
  score,
  likePending,
  ratePending,
  onLikeChange,
  onRateChange,
  favoriteAction,
}: ResourceFeedbackSummaryProps) {
  const scoreAvgText = scoreAvg == null ? '暂无评分' : `平均 ${scoreAvg.toFixed(1)} 分`;

  return (
    <>
      <div className={styles.stats} aria-label="资源互动统计">
        <span className={styles.statItem}>
          <Eye size={14} aria-hidden />
          <span>{formatReadCount(readCount)} 次浏览</span>
        </span>
        <span className={styles.statItem}>
          <Bookmark size={14} aria-hidden />
          <span>{formatReadCount(favoriteCount)} 次收藏</span>
        </span>
        <span className={styles.statItem}>
          <Star size={14} aria-hidden />
          <span>{scoreAvgText}</span>
        </span>
      </div>

      <section className={styles.feedback} aria-labelledby="resource-feedback-title">
        <h3 id="resource-feedback-title" className={styles.sectionTitle}>
          资源反馈
        </h3>
        <div className={styles.feedbackActions}>
          {favoriteAction}
          <ToggleButton
            variant="ghost"
            size="sm"
            isSelected={liked}
            isDisabled={likePending}
            className={styles.helpfulButton}
            onChange={onLikeChange}
          >
            <ThumbsUp size={14} aria-hidden fill={liked ? 'currentColor' : 'none'} />
            <span>有帮助</span>
            <span className={styles.helpfulCount}>{formatReadCount(likeCount)}</span>
          </ToggleButton>
          <Rating
            value={score}
            size="sm"
            isDisabled={ratePending}
            ariaLabel="资源评分"
            onValueChange={onRateChange}
          />
        </div>
      </section>
    </>
  );
}

export default ResourceFeedbackSummary;
