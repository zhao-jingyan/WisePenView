/** 资源交互接口的公共请求体 */
export interface ResourceInteractionApiRequest {
  resourceId: string;
}

/** POST /resource/interaction/rate 请求体 */
export interface RateApiRequest extends ResourceInteractionApiRequest {
  /** 1–5 整数 */
  score: number;
}

/** GET /resource/interaction/getResourceUserInteractionRecord 响应体 */
export interface GetUserInteractionRecordApiResponse {
  /** 是否已点赞；从未有过记录则为 null */
  liked?: boolean | null;
  /** 用户评分 1-5；未评分则为 null */
  score?: number | null;
  /** 当前用户已点赞的评论/回复 ID；后端已存在，前端在评论区使用 */
  likedCommentIds?: string[] | null;
}
