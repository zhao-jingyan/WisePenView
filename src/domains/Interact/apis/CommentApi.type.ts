import type { PageR } from '@/apis/api.type';

export type CommentSortByApiValue = 'CREATE_TIME' | 'LIKE_COUNT';

export interface CommentAuthorApiResponse {
  nickname?: string | null;
  realName?: string | null;
  avatar?: string | null;
}

export interface ResourceCommentItemApiResponse {
  commentId: string;
  replyToUserId?: string | null;
  authorId: string;
  authorInfo?: CommentAuthorApiResponse | null;
  replyToUserInfo?: CommentAuthorApiResponse | null;
  content?: string | null;
  imageUrls?: string[] | null;
  likeCount?: number | null;
  replyCount?: number | null;
  createTime: number;
  deleted?: boolean | null;
}

export interface CreateCommentApiRequest {
  resourceId: string;
  content: string;
  imageUrls: string[];
}

export interface CreateReplyApiRequest extends CreateCommentApiRequest {
  replyTo: string;
}

export interface CommentItemActionApiRequest {
  resourceId: string;
  commentId: string;
}

export interface ListCommentsApiRequest {
  resourceId: string;
  sortBy: CommentSortByApiValue;
  page: number;
  size: number;
}

export interface ListRepliesApiRequest {
  rootCommentId: string;
  page: number;
  size: number;
}

export type CommentPageApiResponse = PageR<ResourceCommentItemApiResponse>;
