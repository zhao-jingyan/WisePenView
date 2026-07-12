import Rating from '@/components/Rating';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { formatReadCount } from '@/utils/format/formatNumber';
import { Separator, ToggleButton, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Eye, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import type { ResourceDiscussionPanelProps } from './index.type';
import styles from './style.module.less';

interface OptimisticLikeState {
  resourceId: string;
  baseCount: number;
  count: number;
  liked: boolean;
}

interface OptimisticRateState {
  resourceId: string;
  score: number;
}

function ResourceDiscussionPanel({ resource, onInteractionSuccess }: ResourceDiscussionPanelProps) {
  const resourceService = useResourceService();
  const [optimisticLike, setOptimisticLike] = useState<OptimisticLikeState>();
  const [optimisticRate, setOptimisticRate] = useState<OptimisticRateState>();
  const resourceId = resource.resourceId;
  const resourceLikeCount = resource.likeCount ?? 0;
  const activeOptimisticLike =
    optimisticLike?.resourceId === resourceId && optimisticLike.baseCount === resourceLikeCount
      ? optimisticLike
      : undefined;
  const activeOptimisticRate =
    optimisticRate?.resourceId === resourceId ? optimisticRate : undefined;

  const { data: likeStatus, refresh: refreshLikeStatus } = useRequest(
    () => resourceService.getLikeStatus(resourceId),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const resolvedLiked = activeOptimisticLike?.liked ?? likeStatus?.liked ?? false;
  const resolvedLikeCount = activeOptimisticLike?.count ?? resourceLikeCount;

  const { run: toggleLike, loading: toggleLikeLoading } = useRequest(
    async (nextLiked: boolean) => {
      await resourceService.interactToggleLike({ resourceId });
      return nextLiked;
    },
    {
      manual: true,
      onSuccess: () => {
        void Promise.resolve(onInteractionSuccess?.()).finally(refreshLikeStatus);
      },
      onError: (error) => {
        setOptimisticLike(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const { data: rate, refresh: refreshRate } = useRequest(
    () => resourceService.getRate(resourceId),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const resolvedScore = activeOptimisticRate?.score ?? rate?.score ?? 0;

  const { run: rateResource, loading: rateLoading } = useRequest(
    async (score: number) => {
      await resourceService.interactRate({ resourceId, score });
      return score;
    },
    {
      manual: true,
      onSuccess: () => {
        void Promise.resolve(onInteractionSuccess?.()).finally(refreshRate);
      },
      onError: (error) => {
        setOptimisticRate(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleLikeChange = (nextLiked: boolean) => {
    const currentCount = activeOptimisticLike?.count ?? resourceLikeCount;
    setOptimisticLike({
      resourceId,
      baseCount: resourceLikeCount,
      count: Math.max(0, currentCount + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });
    toggleLike(nextLiked);
  };

  const handleRateChange = (score: number) => {
    setOptimisticRate({ resourceId, score });
    rateResource(score);
  };

  const scoreAvgText =
    resource.scoreAvg == null ? '暂无评分' : `平均 ${resource.scoreAvg.toFixed(1)} 分`;

  return (
    <aside className={styles.panel} aria-label="资源讨论">
      <div className={styles.header}>
        <h2 className={styles.title}>讨论</h2>
      </div>

      <div className={styles.content}>
        <div className={styles.stats} aria-label="资源互动统计">
          <span className={styles.statItem}>
            <Eye size={14} aria-hidden />
            <span>{formatReadCount(resource.readCount)} 次浏览</span>
          </span>
          <span className={styles.statItem}>
            <Star size={14} aria-hidden />
            <span>{scoreAvgText}</span>
          </span>
        </div>

        <Separator />

        <section className={styles.actionSection} aria-labelledby="resource-feedback-title">
          <h3 id="resource-feedback-title" className={styles.sectionTitle}>
            资源反馈
          </h3>
          <ToggleButton
            variant="ghost"
            size="sm"
            isSelected={resolvedLiked}
            isDisabled={toggleLikeLoading}
            className={styles.helpfulButton}
            onChange={handleLikeChange}
          >
            <ThumbsUp size={14} aria-hidden fill={resolvedLiked ? 'currentColor' : 'none'} />
            <span>有帮助</span>
            <span className={styles.helpfulCount}>{formatReadCount(resolvedLikeCount)}</span>
          </ToggleButton>

          <div className={styles.rateRow}>
            <span className={styles.rateLabel}>你的评分</span>
            <Rating
              value={resolvedScore}
              size="sm"
              isDisabled={rateLoading}
              ariaLabel="资源评分"
              onValueChange={handleRateChange}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}

export default ResourceDiscussionPanel;
