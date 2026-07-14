/** POST /resource/interaction/toggleLike 请求体 */
export interface ToggleLikeApiRequest {
  resourceId: string;
}

/** POST /resource/interaction/rate 请求体 */
export interface RateApiRequest {
  resourceId: string;
  /** 1–5 整数 */
  score: number;
}

/** POST /resource/interaction/read 请求体 */
export interface ReadApiRequest {
  resourceId: string;
}

/** GET /resource/interaction/getResourceUserInteractionRecord 请求参数 */
export interface GetUserInteractionRecordApiRequest {
  resourceId: string;
}

/** GET /resource/interaction/getResourceUserInteractionRecord 响应体 */
export interface GetUserInteractionRecordApiResponse {
  resourceId?: string;
  /** 是否已阅读；从未有过记录则为 null */
  read?: boolean | null;
  /** 是否已点赞；从未有过记录则为 null */
  liked?: boolean | null;
  /** 用户评分 1-5；未评分则为 null */
  score?: number | null;
  /** 当前用户已点赞的评论/回复 ID；后端已存在，前端在评论区使用 */
  likedCommentIds?: string[] | null;
}
