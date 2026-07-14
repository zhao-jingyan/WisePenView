export type CommentSortBy = 'CREATE_TIME' | 'LIKE_COUNT';
export type CommentType = 'COMMENT' | 'REPLY_TO_COMMENT' | 'REPLY_TO_REPLY';

export interface CommentAuthor {
  name: string;
  avatar?: string;
}

export interface ResourceComment {
  commentId: string;
  resourceId: string;
  authorId: string;
  author: CommentAuthor;
  replyToUserId?: string;
  replyToUser?: CommentAuthor;
  content: string;
  imageUrls: string[];
  likeCount: number;
  replyCount: number;
  commentType: CommentType;
  createTime: number;
  deleted: boolean;
}

export interface CommentPage {
  items: ResourceComment[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
