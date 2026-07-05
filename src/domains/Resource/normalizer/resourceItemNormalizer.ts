import type { ResourceItem } from '../entity/resource';

/** 后端 ResourceItemResponse 中的嵌套互动统计结构 */
interface RawInteractionInfo {
  readCount?: number | string | null;
  likeCount?: number | string | null;
  scoreCount?: number | string | null;
  scoreTotal?: number | string | null;
}

/**
 * 将后端 ResourceItemResponse 原始数据归一化为前端 ResourceItem 兼容形态。
 */
export function normalizeResourceItem<T extends Partial<ResourceItem> | null | undefined>(
  raw: T
): T {
  if (raw == null) return raw;
  const next = Object.assign({}, raw) as Partial<ResourceItem>;
  const rawCurrentTags = raw.currentTags;
  // fallback：历史接口与 mock 可能返回数组或省略 currentTags，领域层统一为对象。
  if (rawCurrentTags && typeof rawCurrentTags === 'object' && !Array.isArray(rawCurrentTags)) {
    next.currentTags = rawCurrentTags;
  } else {
    next.currentTags = {};
  }

  const interactionInfo = (raw as unknown as { resourceInteractionInfo?: RawInteractionInfo })
    .resourceInteractionInfo;

  if (interactionInfo) {
    if (interactionInfo.readCount != null) {
      next.readCount = Number(interactionInfo.readCount);
    } else {
      next.readCount = undefined;
    }
    if (interactionInfo.likeCount != null) {
      next.likeCount = Number(interactionInfo.likeCount);
    } else {
      next.likeCount = undefined;
    }
    const scoreCount = interactionInfo.scoreCount != null ? Number(interactionInfo.scoreCount) : 0;
    const scoreTotal = interactionInfo.scoreTotal != null ? Number(interactionInfo.scoreTotal) : 0;
    if (scoreCount > 0) {
      next.scoreAvg = scoreTotal / scoreCount;
    } else {
      next.scoreAvg = null;
    }
  }

  return next as T;
}
