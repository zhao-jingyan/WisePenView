/** POST /resource/interact/toggleLike 请求体 */
export interface ToggleLikeApiRequest {
  resourceId: string;
}

/** POST /resource/interact/rate 请求体 */
export interface RateApiRequest {
  resourceId: string;
  /** 1–5 整数 */
  score: number;
}

/** toggleLike / rate 共用响应基础结构（`data` 字段内容） */
interface InteractApiResponseBase {
  resourceId: string;
  /** 操作后的最新点赞状态 */
  liked: boolean;
  /** 点赞数由后端聚合，当前接口固定返回 null */
  likeCount: null;
}

/** POST /resource/interact/toggleLike 响应 */
export interface ToggleLikeApiResponse extends InteractApiResponseBase {
  /** 点赞接口固定返回 null；前端应沿用本地评分状态 */
  userScore: null;
}

/** POST /resource/interact/rate 响应 */
export interface RateApiResponse extends InteractApiResponseBase {
  /** 评分接口返回最新 userScore */
  userScore: number;
}
