import type { CommentData, ThreadData, YjsThreadStore } from '@blocknote/core/comments';
import type * as Y from 'yjs';

import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemRequest,
  ResourceInlineCommentThread,
  UpdateInlineCommentItemRequest,
  UpdateInlineCommentItemResult,
} from '@/domains/Resource';

type CommentBody = CommentData['body'];

export type InlineCommentDataSource = {
  listInlineComments: (params: { resourceId: string }) => Promise<ResourceInlineCommentThread[]>;
  createInlineComment: (params: CreateInlineCommentRequest) => Promise<string>;
  addInlineCommentItem: (params: AddInlineCommentItemRequest) => Promise<string>;
  updateInlineCommentItem: (
    params: UpdateInlineCommentItemRequest
  ) => Promise<UpdateInlineCommentItemResult>;
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

function waitForInlineCommentSync(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

function readCommentDeletedFromMetadata(metadata: unknown): boolean {
  if (isGettableMapLike(metadata)) {
    return Boolean(metadata.get('deleted'));
  }
  if (isRecord(metadata)) {
    return Boolean(metadata.deleted);
  }
  return false;
}

function isDeletedCommentData(comment: CommentData): boolean {
  return Boolean(comment.deletedAt || readCommentDeletedFromMetadata(comment.metadata));
}

function getVisibleCommentData(comments: CommentData[]): CommentData[] {
  return comments.filter((comment) => !isDeletedCommentData(comment));
}

type InlineCommentItem = ResourceInlineCommentThread['items'][number];

function resolveLatestReplacementItem(
  item: InlineCommentItem,
  replacementByOldItemId: Map<string, InlineCommentItem>
): InlineCommentItem {
  const visitedItemIds = new Set<string>();
  let current = item;
  while (current.itemId && !visitedItemIds.has(current.itemId)) {
    visitedItemIds.add(current.itemId);
    const replacement = replacementByOldItemId.get(current.itemId);
    if (!replacement) {
      return current;
    }
    current = replacement;
  }
  return current;
}

function resolveVisibleInlineCommentItems(items: InlineCommentItem[]): InlineCommentItem[] {
  const replacementByOldItemId = new Map<string, InlineCommentItem>();
  const replacementItemIds = new Set<string>();
  for (const item of items) {
    if (!item.replacesItemId) {
      continue;
    }
    replacementByOldItemId.set(item.replacesItemId, item);
    replacementItemIds.add(item.itemId);
  }

  const visibleItems: InlineCommentItem[] = [];
  const renderedItemIds = new Set<string>();
  for (const item of items) {
    if (replacementItemIds.has(item.itemId)) {
      continue;
    }
    const latestItem = resolveLatestReplacementItem(item, replacementByOldItemId);
    if (latestItem.deleted || renderedItemIds.has(latestItem.itemId)) {
      continue;
    }
    visibleItems.push(latestItem);
    renderedItemIds.add(latestItem.itemId);
  }
  return visibleItems;
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
    deletedAt: item.deleted ? normalizeCommentDate(item.updateTime ?? item.createTime) : undefined,
    reactions: [],
    metadata: {
      deleted: item.deleted,
      inlineCommentId: thread.inlineCommentId,
      replacesItemId: item.replacesItemId,
      authorInfo: item.authorInfo,
    },
    body: item.deleted ? buildTextCommentBody('已删除') : buildTextCommentBody(item.content),
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
      resolveVisibleInlineCommentItems(thread.items).map((item) =>
        mapInlineCommentItemToCommentData(thread, item)
      )
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

function isSuspiciousLocalCommentId(threadId: string, commentId: string): boolean {
  return (
    commentId === threadId ||
    commentId.startsWith('inline-comment-item-local') ||
    commentId.startsWith('inline-thread-local')
  );
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
  const resolveServerCommentItemId = async (
    threadId: string,
    commentId: string
  ): Promise<string> => {
    if (!isSuspiciousLocalCommentId(threadId, commentId)) {
      return commentId;
    }
    const currentThread = getThreadDataFromMap(threadsYMap, threadId);
    const commentIndex =
      currentThread?.comments.findIndex((comment) => comment.id === commentId) ?? -1;
    if (commentIndex < 0) {
      return commentId;
    }

    const serverThreads = await dataSource.listInlineComments({ resourceId });
    const serverThread = serverThreads.find((thread) => thread.inlineCommentId === threadId);
    const serverItem = serverThread
      ? resolveVisibleInlineCommentItems(serverThread.items)[commentIndex]
      : undefined;
    return serverItem?.itemId || commentId;
  };

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
      const localThreadId = createLocalId('inline-thread-local');
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
      const threadId = createdInlineCommentId || localThreadId;

      let latestThreads = await dataSource.listInlineComments({ resourceId });
      let createdThreadFromApi = latestThreads.find((thread) =>
        createdInlineCommentId
          ? thread.inlineCommentId === createdInlineCommentId
          : thread.anchor.externalAnchorId === externalAnchorId
      );
      if (!createdThreadFromApi && createdInlineCommentId) {
        await waitForInlineCommentSync(120);
        latestThreads = await dataSource.listInlineComments({ resourceId });
        createdThreadFromApi = latestThreads.find(
          (thread) => thread.inlineCommentId === createdInlineCommentId
        );
      }
      if (createdThreadFromApi) {
        const createdThread = mapInlineCommentThreadToThreadData(createdThreadFromApi);
        setThreadDataToMap(threadsYMap, createdThread);
        return createdThread;
      }
      if (createdInlineCommentId) {
        throw new Error('批注创建失败');
      }

      const now = new Date();
      const createdThread: PlainThreadRecord = {
        type: 'thread',
        id: threadId,
        createdAt: now,
        updatedAt: now,
        comments: [
          {
            type: 'comment',
            id: createdInlineCommentId || createLocalId('inline-comment-item-local'),
            userId: getCurrentUserId(),
            createdAt: now,
            updatedAt: now,
            reactions: [],
            metadata: args.initialComment.metadata ?? {},
            body: args.initialComment.body,
          },
        ],
        resolved: false,
        metadata: {
          ...(args.metadata ?? {}),
          ...(referenceText ? { quoteText: referenceText } : {}),
          externalAnchorId,
          inlineCommentPendingServerId: !createdInlineCommentId,
        },
      };

      setThreadDataToMap(threadsYMap, createdThread);
      return createdThread;
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
      const itemId = createdItemId || createLocalId('inline-comment-item-local');

      const comment: CommentData = {
        type: 'comment',
        id: itemId,
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
      const currentThread = getThreadDataFromMap(threadsYMap, args.threadId);
      const itemIndex = currentThread?.comments.findIndex(
        (comment) => comment.id === args.commentId
      );
      const serverItemId = await resolveServerCommentItemId(args.threadId, args.commentId);
      const updateResult = await dataSource.updateInlineCommentItem({
        resourceId,
        inlineCommentId: args.threadId,
        itemId: serverItemId,
        ...(itemIndex != null && itemIndex >= 0 ? { itemIndex } : {}),
        content,
        imageUrls: [],
        mentionUserIds: [],
      });
      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        updatedAt: now,
        comments: thread.comments.map((comment) =>
          comment.id === args.commentId
            ? {
                ...comment,
                id: updateResult.newItemId || createLocalId('inline-comment-item-local'),
                userId: getCurrentUserId(),
                createdAt: now,
                updatedAt: now,
                metadata: {
                  ...(isRecord(comment.metadata) ? comment.metadata : {}),
                  ...(args.comment.metadata ?? {}),
                  replacesItemId: updateResult.oldItemId || serverItemId,
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

      const now = new Date();
      updateThreadInMap(threadsYMap, args.threadId, (thread) => ({
        ...thread,
        updatedAt: now,
        comments: thread.comments.map((comment) =>
          comment.id === args.commentId
            ? {
                ...comment,
                body: buildTextCommentBody('已删除'),
                deletedAt: now,
                updatedAt: now,
                metadata: {
                  ...(isRecord(comment.metadata) ? comment.metadata : {}),
                  deleted: true,
                },
              }
            : comment
        ),
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
