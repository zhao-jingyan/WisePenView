export interface InlineCommentAnchorApi {
  start: string;
  end: string;
}

export interface InlineCommentAuthorApi {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface InlineCommentItemApi {
  commentId: string;
  authorId: string;
  author: InlineCommentAuthorApi;
  content: string;
  createdAt: string;
  revision: string;
}

export interface InlineCommentThreadApi {
  threadId: string;
  resourceId: string;
  anchor: InlineCommentAnchorApi;
  quoteText: string;
  items: InlineCommentItemApi[];
  revision: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInlineCommentThreadApiRequest {
  resourceId: string;
  idempotencyKey: string;
  anchor: InlineCommentAnchorApi;
  quoteText: string;
  content: string;
}

export interface AddInlineCommentApiRequest {
  idempotencyKey: string;
  content: string;
}

export interface ListInlineCommentThreadsApiRequest {
  resourceId: string;
}

export interface GetInlineCommentChangesApiRequest {
  resourceId: string;
  cursor?: string;
}

export interface InlineCommentChangeApi {
  threadId: string;
  revision: string;
}

export interface InlineCommentChangesApiResponse {
  items: InlineCommentChangeApi[];
  cursor: string;
}

export interface ListInlineCommentThreadsApiResponse {
  items: InlineCommentThreadApi[];
  cursor: string;
}
