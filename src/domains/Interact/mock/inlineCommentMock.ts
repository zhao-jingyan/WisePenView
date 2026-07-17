import type {
  AddInlineCommentRequest,
  CreateInlineCommentThreadRequest,
  GetInlineCommentChangesRequest,
  GetInlineCommentRequest,
  GetInlineCommentThreadRequest,
  InlineComment,
  InlineCommentChanges,
  InlineCommentThread,
  InlineCommentThreadList,
  ListInlineCommentThreadsRequest,
} from '@/domains/Interact';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';

const inlineCommentThreads = new Map<string, InlineCommentThread>();
const inlineCommentIdempotency = new Map<string, string>();
const inlineCommentItemIdempotency = new Map<string, InlineComment>();

const createMockComment = (content: string, revision: number): InlineComment => ({
  commentId: `mock-comment-${createUuid()}`,
  authorId: 'mock-current-user',
  author: { id: 'mock-current-user', name: '当前用户' },
  content,
  createdAt: Date.now(),
  revision,
});

export const createInlineCommentThread = async (
  params: CreateInlineCommentThreadRequest
): Promise<InlineCommentThread> => {
  const existingThreadId = inlineCommentIdempotency.get(params.idempotencyKey);
  const existingThread = existingThreadId ? inlineCommentThreads.get(existingThreadId) : undefined;
  if (existingThread) return existingThread;

  const createdAt = Date.now();
  const thread: InlineCommentThread = {
    threadId: `mock-thread-${createUuid()}`,
    resourceId: params.resourceId,
    anchor: params.anchor,
    quoteText: params.quoteText,
    items: [createMockComment(params.content, 1)],
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  };
  inlineCommentThreads.set(thread.threadId, thread);
  inlineCommentIdempotency.set(params.idempotencyKey, thread.threadId);
  return thread;
};

export const addInlineComment = async (params: AddInlineCommentRequest): Promise<InlineComment> => {
  const thread = inlineCommentThreads.get(params.threadId);
  if (!thread) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  const idempotencyKey = `${params.threadId}:${params.idempotencyKey}`;
  const existingComment = inlineCommentItemIdempotency.get(idempotencyKey);
  if (existingComment) return existingComment;

  const comment = createMockComment(params.content, thread.revision + 1);
  inlineCommentThreads.set(params.threadId, {
    ...thread,
    items: [...thread.items, comment],
    revision: comment.revision,
    updatedAt: comment.createdAt,
  });
  inlineCommentItemIdempotency.set(idempotencyKey, comment);
  return comment;
};

export const listInlineCommentThreads = async (
  params: ListInlineCommentThreadsRequest
): Promise<InlineCommentThreadList> => ({
  items: [...inlineCommentThreads.values()].filter(
    (thread) => thread.resourceId === params.resourceId
  ),
  cursor: 'mock-cursor',
});

export const getInlineCommentThread = async (
  params: GetInlineCommentThreadRequest
): Promise<InlineCommentThread> => {
  const thread = inlineCommentThreads.get(params.threadId);
  if (!thread) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  return thread;
};

export const getInlineComment = async (params: GetInlineCommentRequest): Promise<InlineComment> => {
  const thread = await getInlineCommentThread(params);
  const comment = thread.items.find((item) => item.commentId === params.commentId);
  if (!comment) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  return comment;
};

export const getInlineCommentChanges = async (
  _params: GetInlineCommentChangesRequest
): Promise<InlineCommentChanges> => ({ items: [], cursor: 'mock-cursor' });
