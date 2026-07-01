/** 资源点赞薄层：自行获取点赞状态 + 防抖请求，UI 委托给 LikeButton 组件 */
import { useDebounceFn, useRequest } from 'ahooks';
import { useState } from 'react';

import LikeButton from '@/components/LikeButton';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import type { ResourceLikeButtonProps } from './index.type';

/** 防抖时长（ms）：2s 内连续点击合并为一次请求 */
const TOGGLE_LIKE_DEBOUNCE_MS = 2000;

function ResourceLikeButton({ resourceId }: ResourceLikeButtonProps) {
  const resourceService = useResourceService();
  const [displayLiked, setDisplayLiked] = useState<boolean | undefined>(undefined);

  // 自行获取初始点赞状态，无需父组件传入
  const { data: likeStatusData } = useRequest(() => resourceService.getLikeStatus(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
    onSuccess: () => setDisplayLiked(undefined),
  });

  const resolvedLiked = displayLiked ?? likeStatusData?.liked ?? false;

  const { run: runToggleLike } = useRequest(
    () => resourceService.interactToggleLike({ resourceId }),
    {
      manual: true,
      onError: (err) => {
        setDisplayLiked(undefined);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { run: debouncedToggle } = useDebounceFn(runToggleLike, { wait: TOGGLE_LIKE_DEBOUNCE_MS });

  const handleLikeClick = () => {
    setDisplayLiked(!resolvedLiked);
    debouncedToggle();
  };

  return <LikeButton liked={resolvedLiked} onClick={handleLikeClick} />;
}

export default ResourceLikeButton;
