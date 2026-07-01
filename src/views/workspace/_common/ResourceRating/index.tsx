/** 资源评分薄层：自行获取初始评分 + 防抖提交请求，UI 委托给 Rating 组件 */
import { useDebounceFn, useRequest } from 'ahooks';
import { useMemo, useState } from 'react';

import Rating from '@/components/Rating';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import type { ResourceRatingProps } from './index.type';
import styles from './style.module.less';

/** 防抖时长（ms）：2s 内连续操作合并为一次请求 */
const RATE_DEBOUNCE_MS = 2000;

const RATE_HINT: Record<number, string> = {
  1: '失望',
  2: '一般',
  3: '还行',
  4: '不错',
  5: '很棒',
};

function ResourceRating({ resourceId, onRateSuccess }: ResourceRatingProps) {
  const resourceService = useResourceService();
  const [displayUserScore, setDisplayUserScore] = useState<number | null | undefined>(undefined);

  // 自行获取初始评分，无需父组件传入
  const { data: rateData } = useRequest(() => resourceService.getRate(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
    onSuccess: () => setDisplayUserScore(undefined),
  });

  const resolvedScore = displayUserScore ?? rateData?.score ?? 0;

  const rateHintText = useMemo(() => {
    if (displayUserScore != null) return RATE_HINT[displayUserScore] ?? `${displayUserScore} 分`;
    return resolvedScore ? `已评 ${resolvedScore} 分` : '评个分吧';
  }, [displayUserScore, resolvedScore]);

  const { run: runRate } = useRequest(
    (score: number) => resourceService.interactRate({ resourceId, score }),
    {
      manual: true,
      onSuccess: () => onRateSuccess?.(),
      onError: (err) => {
        setDisplayUserScore(undefined);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { run: debouncedRate } = useDebounceFn(runRate, { wait: RATE_DEBOUNCE_MS });

  const handleRateChange = (nextScore: number) => {
    setDisplayUserScore(nextScore);
    debouncedRate(nextScore);
  };

  return (
    <div className={styles.rateSection}>
      <div className={styles.rateWrap}>
        <Rating value={resolvedScore} onValueChange={handleRateChange} />
        <span className={styles.interactLabel}>{rateHintText}</span>
      </div>
    </div>
  );
}

export default ResourceRating;
