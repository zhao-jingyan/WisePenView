import { apiGet, apiPost } from '@/apis/request';

import type {
  CommentItemActionApiRequest,
  CommentPageApiResponse,
  CreateCommentApiRequest,
  CreateReplyApiRequest,
  ListCommentsApiRequest,
  ListRepliesApiRequest,
} from './CommentApi.type';

const createComment = (req: CreateCommentApiRequest): Promise<string> =>
  apiPost('/resource/comment/createComment', req);

const createReply = (req: CreateReplyApiRequest): Promise<string> =>
  apiPost('/resource/comment/createReply', req);

const deleteCommentItem = (req: CommentItemActionApiRequest): Promise<void> =>
  apiPost('/resource/comment/deleteCommentItem', req);

const toggleLike = (req: CommentItemActionApiRequest): Promise<boolean> =>
  apiPost('/resource/comment/toggleLike', req);

const listComments = (req: ListCommentsApiRequest): Promise<CommentPageApiResponse> =>
  apiGet('/resource/comment/listComments', { params: req });

const listReplies = (req: ListRepliesApiRequest): Promise<CommentPageApiResponse> =>
  apiGet('/resource/comment/listReplies', { params: req });

export const CommentApi = {
  createComment,
  createReply,
  deleteCommentItem,
  toggleLike,
  listComments,
  listReplies,
};
