import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeFiniteNumber } from '@/utils/normalize/normalizeNumber';
import type {
  AddInlineCommentApiRequest,
  CreateInlineCommentThreadApiRequest,
  InlineCommentChangesApiResponse,
  InlineCommentItemApi,
  InlineCommentThreadApi,
  ListInlineCommentThreadsApiRequest,
  ListInlineCommentThreadsApiResponse,
} from '../apis/InlineCommentApi.type';
import type {
  InlineComment,
  InlineCommentAuthor,
  InlineCommentThread,
  InlineCommentThreadList,
} from '../entity/inlineComment';
import type {
  AddInlineCommentRequest,
  CreateInlineCommentThreadRequest,
  InlineCommentChanges,
  ListInlineCommentThreadsRequest,
} from '../service/index.type';

function requiredId(value: string | undefined, field: string): string {
  const id = normalizeId(value);
  if (!id) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason: `批注 ${field} 缺失` });
  }
  return id;
}

function requiredText(value: string, field: string): string {
  if (!value.trim()) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `批注 ${field} 缺失`,
    });
  }
  return value;
}

function mapTimestamp(value: string, field: string): number {
  const timestamp = normalizeFiniteNumber(value);
  if (timestamp === undefined) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `批注 ${field} 无效`,
    });
  }
  return timestamp;
}

function mapRevision(value: string, field: string): number {
  const revision = normalizeFiniteNumber(value);
  if (revision === undefined || !Number.isSafeInteger(revision) || revision < 1) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `批注 ${field} 无效`,
    });
  }
  return revision;
}

function mapAuthor(author: InlineCommentItemApi['author']): InlineCommentAuthor {
  return {
    id: requiredId(author.id, '作者 ID'),
    name: requiredText(author.name, '作者名称').trim(),
    avatar: author.avatar?.trim() || undefined,
  };
}

function mapComment(item: InlineCommentItemApi): InlineComment {
  return {
    commentId: requiredId(item.commentId, 'commentId'),
    authorId: requiredId(item.authorId, 'authorId'),
    author: mapAuthor(item.author),
    content: requiredText(item.content, 'content'),
    createdAt: mapTimestamp(item.createdAt, 'createdAt'),
    revision: mapRevision(item.revision, 'Comment revision'),
  };
}

function mapThread(data: InlineCommentThreadApi): InlineCommentThread {
  return {
    threadId: requiredId(data.threadId, 'threadId'),
    resourceId: requiredId(data.resourceId, 'resourceId'),
    anchor: {
      start: requiredText(data.anchor.start, 'anchor.start'),
      end: requiredText(data.anchor.end, 'anchor.end'),
    },
    quoteText: requiredText(data.quoteText, 'quoteText'),
    items: data.items.map(mapComment),
    revision: mapRevision(data.revision, 'Thread revision'),
    createdAt: mapTimestamp(data.createdAt, 'createdAt'),
    updatedAt: mapTimestamp(data.updatedAt, 'updatedAt'),
  };
}

const mapCreateThreadRequest = (
  params: CreateInlineCommentThreadRequest
): CreateInlineCommentThreadApiRequest => ({
  resourceId: params.resourceId,
  idempotencyKey: params.idempotencyKey,
  anchor: params.anchor,
  quoteText: params.quoteText,
  content: params.content,
});

const mapAddCommentRequest = (params: AddInlineCommentRequest): AddInlineCommentApiRequest => ({
  idempotencyKey: params.idempotencyKey,
  content: params.content,
});

const mapListThreadsRequest = (
  params: ListInlineCommentThreadsRequest
): ListInlineCommentThreadsApiRequest => ({ resourceId: params.resourceId });

const mapThreadsFromApi = (data: ListInlineCommentThreadsApiResponse): InlineCommentThreadList => ({
  items: data.items.map(mapThread),
  cursor: requiredText(data.cursor, 'cursor'),
});

const mapChangesFromApi = (data: InlineCommentChangesApiResponse): InlineCommentChanges => ({
  items: data.items.map((item) => ({
    threadId: requiredId(item.threadId, 'threadId'),
    revision: mapRevision(item.revision, 'Thread revision'),
  })),
  cursor: requiredText(data.cursor, 'cursor'),
});

export const InlineCommentServicesMap = {
  mapCreateThreadRequest,
  mapAddCommentRequest,
  mapListThreadsRequest,
  mapComment,
  mapThread,
  mapThreadsFromApi,
  mapChangesFromApi,
};
