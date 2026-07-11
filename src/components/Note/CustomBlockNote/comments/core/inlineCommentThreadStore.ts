import type { CommentData, ThreadData, YjsThreadStore } from '@blocknote/core/comments';
import type * as Y from 'yjs';

import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemRequest,
  ResourceInlineCommentThread,
  UpdateInlineCommentItemRequest,
} from '@/domains/Resource';

import { bumpInlineCommentListSyncEpoch } from './inlineCommentListSyncEpoch';

type CommentBody = CommentData['body'];

export type InlineCommentDataSource = {
  listInlineComments: (params: { resourceId: string }) => Promise<ResourceInlineCommentThread[]>;
  createInlineComment: (params: CreateInlineCommentRequest) => Promise<string>;
  addInlineCommentItem: (params: AddInlineCommentItemRequest) => Promise<string>;
  updateInlineCommentItem: (params: UpdateInlineCommentItemRequest) => Promise<void>;
  deleteInlineCommentItem: (params: DeleteInlineCommentItemRequest) => Promise<void>;
  changeInlineCommentResolveStatus: (
    params: ChangeInlineCommentResolveStatusRequest
  ) => Promise<void>;
};

type CreateThreadArgs = {
  initialComment: {
    body: CommentBody;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
};

type AddCommentArgs = {
  threadId: string;
  comment: {
    body: CommentBody;
    metadata?: Record<string, unknown>;
  };
};

type UpdateCommentArgs = AddCommentArgs & {
  commentId: string;
};

type DeleteCommentArgs = {
  threadId: string;
  commentId: string;
  softDelete?: boolean;
};

type ResolveThreadArgs = {
  threadId: string;
};

type ThreadStoreSubscriber = (threads: Map<string, ThreadData>) => void;

type GettableMapLike = {
  get: (key: string | number) => unknown;
};

type GettableArrayLike = {
  get: (index: number) => unknown;
  length: number;
};

type ThreadStoreRuntime = Record<string, unknown> & {
  userId: string;
  auth: YjsThreadStore['auth'];
  addThreadToDocument?: (args: unknown) => Promise<void>;
};

type PlainThreadRecord = ThreadData & {
  metadata?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGettableMapLike(value: unknown): value is GettableMapLike {
  return isRecord(value) && typeof value.get === 'function';
}

function isGettableArrayLike(value: unknown): value is GettableArrayLike {
  return isRecord(value) && typeof value.get === 'function' && typeof value.length === 'number';
}

function isCommentData(value: CommentData | null): value is CommentData {
  return value !== null;
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildTextCommentBody(content: string): CommentBody {
  const text = content.trim();
  return [
    {
      id: createLocalId('comment-block'),
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: text
        ? [
            {
              type: 'text',
              text,
              styles: {},
            },
          ]
        : [],
      children: [],
    },
  ] as CommentBody;
}

export function extractPlainTextFromCommentBody(body: unknown): string {
  if (typeof body === 'string') {
    return body.trim();
  }
  if (Array.isArray(body)) {
    return body.map(extractPlainTextFromCommentBody).filter(Boolean).join('').trim();
  }
  if (!isRecord(body)) {
    return '';
  }
  const text = typeof body.text === 'string' ? body.text : '';
  const content = extractPlainTextFromCommentBody(body.content);
  const children = extractPlainTextFromCommentBody(body.children);
  return `${text}${content}${children}`.trim();
}

function normalizeCommentDate(value: unknown): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

function normalizeOptionalCommentDate(value: unknown): Date | undefined {
  if (value == null) {
    return undefined;
  }
  return normalizeCommentDate(value);
}

function getVisibleCommentData(comments: CommentData[]): CommentData[] {
  return comments.filter((comment) => !comment.deletedAt);
}

function mapInlineCommentItemToCommentData(
  thread: ResourceInlineCommentThread,
  item: ResourceInlineCommentThread['items'][number]
): CommentData {
  const createdAt = normalizeCommentDate(item.createTime);
  const updatedAt = item.updateTime ? normalizeCommentDate(item.updateTime) : createdAt;
  return {
    type: 'comment',
    id: item.itemId,
    userId: item.authorId,
    createdAt,
    updatedAt,
    reactions: [],
    metadata: {
      inlineCommentId: thread.inlineCommentId,
      authorInfo: item.authorInfo,
    },
    body: buildTextCommentBody(item.content),
  };
}

function mapInlineCommentThreadToThreadData(
  thread: ResourceInlineCommentThread
): PlainThreadRecord {
  const createdAt = normalizeCommentDate(thread.createTime);
  const updatedAt = thread.updateTime ? normalizeCommentDate(thread.updateTime) : createdAt;
  return {
    type: 'thread',
    id: thread.inlineCommentId,
    createdAt,
    updatedAt,
    comments: getVisibleCommentData(
      thread.items.map((item) => mapInlineCommentItemToCommentData(thread, item))
    ),
    resolved: thread.resolved,
    resolvedUpdatedAt: thread.resolvedAt ? new Date(thread.resolvedAt) : undefined,
    resolvedBy: thread.resolvedBy,
    metadata: {
      externalAnchorId: thread.anchor.externalAnchorId,
      quoteText: thread.anchor.quoteText,
      anchorKind: thread.anchor.kind,
      anchorPayload: thread.anchor.anchorPayload,
    },
  };
}

function readCommentFromRaw(rawComment: unknown): CommentData | null {
  if (isGettableMapLike(rawComment)) {
    const createdAt = normalizeCommentDate(rawComment.get('createdAt'));
    return {
      type: 'comment',
      id: String(rawComment.get('id') ?? ''),
      userId: String(rawComment.get('userId') ?? ''),
      createdAt,
      updatedAt: normalizeOptionalCommentDate(rawComment.get('updatedAt')) ?? createdAt,
      deletedAt: normalizeOptionalCommentDate(rawComment.get('deletedAt')),
      reactions: [],
      metadata: (rawComment.get('metadata') as Record<string, unknown> | undefined) ?? {},
      body: rawComment.get('body') as CommentBody,
    };
  }

  if (!isRecord(rawComment)) {
    return null;
  }

  const comment = rawComment as CommentData;
  const createdAt = normalizeCommentDate(comment.createdAt);
  return {
    ...comment,
    createdAt,
    updatedAt: normalizeOptionalCommentDate(comment.updatedAt) ?? createdAt,
    deletedAt: normalizeOptionalCommentDate(comment.deletedAt),
  };
}

function readThreadDataFromRaw(rawThread: unknown, fallbackId: string): ThreadData | null {
  if (isGettableMapLike(rawThread)) {
    const rawComments = rawThread.get('comments');
    const comments: CommentData[] = [];
    if (isGettableArrayLike(rawComments)) {
      for (let index = 0; index < rawComments.length; index += 1) {
        const comment = readCommentFromRaw(rawComments.get(index));
        if (comment) {
          comments.push(comment);
        }
      }
    }
    const createdAt = normalizeCommentDate(rawThread.get('createdAt'));
    return {
      type: 'thread',
      id: String(rawThread.get('id') ?? fallbackId),
      createdAt,
      updatedAt: normalizeOptionalCommentDate(rawThread.get('updatedAt')) ?? createdAt,
      comments: getVisibleCommentData(comments),
      resolved: Boolean(rawThread.get('resolved')),
      resolvedUpdatedAt: normalizeOptionalCommentDate(rawThread.get('resolvedUpdatedAt')),
      resolvedBy: (rawThread.get('resolvedBy') as string | undefined) ?? undefined,
      metadata: (rawThread.get('metadata') as Record<string, unknown> | undefined) ?? {},
    };
  }

  if (!isRecord(rawThread)) {
    return null;
  }

  const thread = rawThread as ThreadData;
  const createdAt = normalizeCommentDate(thread.createdAt);
  return {
    ...thread,
    id: thread.id || fallbackId,
    createdAt,
    updatedAt: normalizeOptionalCommentDate(thread.updatedAt) ?? createdAt,
    resolvedUpdatedAt: normalizeOptionalCommentDate(thread.resolvedUpdatedAt),
    comments: Array.isArray(thread.comments)
      ? getVisibleCommentData(
          thread.comments.map((comment) => readCommentFromRaw(comment)).filter(isCommentData)
        )
      : [],
  };
}

function getThreadDataFromMap(threadsYMap: Y.Map<unknown>, threadId: string): ThreadData | null {
  return readThreadDataFromRaw(threadsYMap.get(threadId), threadId);
}

function setThreadDataToMap(threadsYMap: Y.Map<unknown>, thread: PlainThreadRecord): void {
  threadsYMap.set(thread.id, thread as unknown);
}

export function buildThreadSnapshot(threadsYMap: Y.Map<unknown>): Map<string, ThreadData> {
  const snapshot = new Map<string, ThreadData>();
  threadsYMap.forEach((rawThread, threadId) => {
    const thread = readThreadDataFromRaw(rawThread, String(threadId));
    if (thread && thread.comments.length > 0) {
      snapshot.set(thread.id, thread);
    }
  });
  return snapshot;
}

export function syncInlineCommentThreadsToYjs(
  threadsYMap: Y.Map<unknown>,
  threads: ResourceInlineCommentThread[]
): void {
  const nextIds = new Set(threads.map((thread) => thread.inlineCommentId));

  threadsYMap.doc?.transact(() => {
    threads.forEach((thread) => {
      setThreadDataToMap(threadsYMap, mapInlineCommentThreadToThreadData(thread));
    });

    Array.from(threadsYMap.keys()).forEach((threadId) => {
      const id = String(threadId);
      const rawThread = threadsYMap.get(threadId);
      const current = readThreadDataFromRaw(rawThread, id);
      if (!current?.metadata || nextIds.has(id)) {
        return;
      }
      const externalAnchorId = (current.metadata as Record<string, unknown>).externalAnchorId;
      if (typeof externalAnchorId === 'string' && externalAnchorId.trim()) {
        threadsYMap.delete(threadId);
      }
    });
  });
}

function updateThreadInMap(
  threadsYMap: Y.Map<unknown>,
  threadId: string,
  updater: (thread: ThreadData) => ThreadData
): ThreadData {
  const current = getThreadDataFromMap(threadsYMap, threadId);
  if (!current) {
    throw new Error('Thread not found');
  }
  const next = updater(current);
  setThreadDataToMap(threadsYMap, next as PlainThreadRecord);
  return next;
}

export function createInlineCommentThreadStore(options: {
  resourceId: string;
  threadsYMap: Y.Map<unknown>;
  threadStore: YjsThreadStore;
  dataSource: InlineCommentDataSource;
  getActiveCommentUserId: () => string;
  getPendingReferenceText?: () => string | undefined;
}): YjsThreadStore {
  const {
    resourceId,
    threadsYMap,
    threadStore,
    dataSource,
    getActiveCommentUserId,
    getPendingReferenceText,
  } = options;
  const baseStore = threadStore as unknown as ThreadStoreRuntime;
  const getCurrentUserId = () => getActiveCommentUserId() || baseStore.userId;

  const customStore: ThreadStoreRuntime = {
    ...baseStore,
    getThread(threadId: string) {
      const thread = getThreadDataFromMap(threadsYMap, threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }
      return thread;
    },
    getThreads() {
      return buildThreadSnapshot(threadsYMap);
    },
    subscribe(subscriber: ThreadStoreSubscriber) {
      const emit = () => subscriber(buildThreadSnapshot(threadsYMap));
      emit();
      threadsYMap.observeDeep(emit);
      return () => {
        threadsYMap.unobserveDeep(emit);
      };
    },
    async createThread(args: CreateThreadArgs) {
      const externalAnchorId = createLocalId('inline-anchor');
      const initialContent = extractPlainTextFromCommentBody(args.initialComment.body);
      const referenceText =
        getPendingReferenceText?.() ??
        (typeof args.metadata?.referenceText === 'string'
          ? args.metadata.referenceText
          : undefined);
      const createdInlineCommentId = await dataSource.createInlineComment({
        resourceId,
        externalAnchorId,
        quoteText: referenceText,
        content: initialContent,
        anchorPayload: {},
        imageUrls: [],
        mentionUserIds: [],
      });
      // 使挂载期等在途 list 失效，避免用旧列表把刚创建的 thread/sidecar 清掉
      bumpInlineCommentListSyncEpoch();

      const latestThreads = await dataSource.listInlineComments({ resourceId });
      const createdThreadFromApi = latestThreads.find(
        (thread) => thread.inlineCommentId === createdInlineCommentId
      );
      if (createdThreadFromApi) {
        const createdThread = mapInlineCommentThreadToThreadData(createdThreadFromApi);
        setThreadDataToMap(threadsYMap, createdThread);
        return createdThread;
      }
      throw new Error('批注创建失败');
    },
    async addComment(args: AddCommentArgs) {
      const now = new Date();
      const content = extractPlainTextFromCommentBody(args.comment.body);
      const createdItemId = await dataSource.addInlineCommentItem({
        resourceId,
        inlineCommentId: args.threadId,
        content,
        imageUrls: [],
        mentionUserIds: [],
      });
      bumpInlineCommentListSyncEpoch();

      const comment: CommentData = {
        type: 'comment',
        id: createdItemId,
        userId: getCurrentUserId(),
        createdAt: now,
        updatedAt: now,
        reactions: [],
        metadata: args.comment.metadata ?? {},
        body: args.comment.body,
      };

      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        updatedAt: now,
        comments: [...thread.comments, comment],
      }));

      return comment;
    },
    async updateComment(args: UpdateCommentArgs) {
      const content = extractPlainTextFromCommentBody(args.comment.body);
      await dataSource.updateInlineCommentItem({
        resourceId,
        inlineCommentId: args.threadId,
        itemId: args.commentId,
        content,
        imageUrls: [],
        mentionUserIds: [],
      });
      bumpInlineCommentListSyncEpoch();
      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        updatedAt: now,
        comments: thread.comments.map((comment) =>
          comment.id === args.commentId
            ? {
                ...comment,
                userId: getCurrentUserId(),
                updatedAt: now,
                metadata: {
                  ...(isRecord(comment.metadata) ? comment.metadata : {}),
                  ...(args.comment.metadata ?? {}),
                },
                body: args.comment.body,
              }
            : comment
        ),
      }));
    },
    async deleteComment(args: DeleteCommentArgs) {
      await dataSource.deleteInlineCommentItem({
        resourceId,
        inlineCommentId: args.threadId,
        itemId: args.commentId,
      });
      bumpInlineCommentListSyncEpoch();

      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        updatedAt: now,
        comments: thread.comments.filter((comment) => comment.id !== args.commentId),
      }));
    },
    async deleteThread() {
      throw new Error('当前后端暂不支持删除整条批注串');
    },
    async resolveThread(args: ResolveThreadArgs) {
      await dataSource.changeInlineCommentResolveStatus({
        resourceId,
        inlineCommentId: args.threadId,
        resolved: true,
      });
      bumpInlineCommentListSyncEpoch();

      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        resolved: true,
        resolvedBy: getCurrentUserId(),
        resolvedUpdatedAt: now,
        updatedAt: now,
      }));
    },
    async unresolveThread(args: ResolveThreadArgs) {
      await dataSource.changeInlineCommentResolveStatus({
        resourceId,
        inlineCommentId: args.threadId,
        resolved: false,
      });
      bumpInlineCommentListSyncEpoch();

      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        resolved: false,
        resolvedBy: undefined,
        resolvedUpdatedAt: undefined,
        updatedAt: now,
      }));
    },
    async addReaction() {
      throw new Error('当前后端暂不支持批注表情反应');
    },
    async deleteReaction() {
      throw new Error('当前后端暂不支持批注表情反应');
    },
  };

  if (typeof baseStore.addThreadToDocument === 'function') {
    customStore.addThreadToDocument = baseStore.addThreadToDocument.bind(baseStore);
  }

  return customStore as unknown as YjsThreadStore;
}
