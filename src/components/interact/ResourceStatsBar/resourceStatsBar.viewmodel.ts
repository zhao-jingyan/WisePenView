import type { ResourceInteractStats } from '@/domains/Resource';

export interface ResourceStatsBarViewModel {
  readCount?: number | null;
  likeCount?: number | null;
  scoreAvgText: string;
}

export const buildResourceStatsBarViewModel = (
  stats: ResourceInteractStats
): ResourceStatsBarViewModel => {
  return {
    readCount: stats.readCount,
    likeCount: stats.likeCount,
    scoreAvgText: stats.scoreAvg != null ? `${stats.scoreAvg.toFixed(1)} 分` : '暂无评分',
  };
};
