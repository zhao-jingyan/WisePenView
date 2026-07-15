import type {
  CommentData,
  CommentReactionData,
  ThreadData,
  ThreadStoreAuth,
} from '@blocknote/core/comments';
import { ThreadStore } from '@blocknote/core/comments';
import type * as Y from 'yjs';

import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemReactionRequest,
  DeleteInlineCommentItemRequest,
  ResourceInlineCommentThread,
  SetInlineCommentItemReactionRequest,
  UpdateInlineCommentItemRequest,
} from '@/domains/Resource';

type InlineCommentBody = CommentData['body'];

const remoteSyncRevisions = new WeakMap<Y.Map<unknown>, number>();

export function invalidateRemoteInlineCommentSync(threadsYMap: Y.Map<unknown>): void {
  remoteSyncRevisions.set(threadsYMap, getRemoteInlineCommentSyncRevision(threadsYMap) + 1);
}

export function getRemoteInlineCommentSyncRevision(threadsYMap: Y.Map<unknown>): number {
  return remoteSyncRevisions.get(threadsYMap) ?? 0;
}

export type RemoteInlineCommentDataSource = {
  listInlineComments: (params: { resourceId: string }) => Promise<ResourceInlineCommentThread[]>;
  createInlineComment: (params: CreateInlineCommentRequest) => Promise<string>;
  addInlineCommentItem: (params: AddInlineCommentItemRequest) => Promise<string>;
  updateInlineCommentItem: (params: UpdateInlineCommentItemRequest) => Promise<void>;
  setInlineCommentItemReaction: (params: SetInlineCommentItemReactionRequest) => Promise<void>;
  deleteInlineCommentItemReaction: (
    params: DeleteInlineCommentItemReactionRequest
  ) => Promise<void>;
  deleteInlineCommentItem: (params: DeleteInlineCommentItemRequest) => Promise<void>;
  changeInlineCommentResolveStatus: (
    params: ChangeInlineCommentResolveStatusRequest
  ) => Promise<void>;
};

type CreateThreadArgs = {
  initialComment: {
    body: InlineCommentBody;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
};

type AddCommentArgs = {
  threadId: string;
  comment: {
    body: InlineCommentBody;
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

type ReactionArgs = {
  threadId: string;
  commentId: string;
  emoji: string;
};

type GettableMapLike = {
  get: (key: string | number) => unknown;
};

type GettableArrayLike = {
  get: (index: number) => unknown;
  length: number;
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

export function buildTextInlineCommentBody(content: string): InlineCommentBody {
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
  ] as InlineCommentBody;
}

export function extractPlainTextFromInlineCommentBody(body: unknown): string {
  if (typeof body === 'string') {
    return body.trim();
  }
  if (Array.isArray(body)) {
    return body.map(extractPlainTextFromInlineCommentBody).filter(Boolean).join('').trim();
  }
  if (!isRecord(body)) {
    return '';
  }
  const text = typeof body.text === 'string' ? body.text : '';
  const content = extractPlainTextFromInlineCommentBody(body.content);
  const children = extractPlainTextFromInlineCommentBody(body.children);
  return `${text}${content}${children}`.trim();
}

function normalizeInlineCommentDate(value: unknown): Date {
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

function normalizeOptionalInlineCommentDate(value: unknown): Date | undefined {
  if (value == null) {
    return undefined;
  }
  return normalizeInlineCommentDate(value);
}

function getVisibleInlineCommentData(comments: CommentData[]): CommentData[] {
  return comments.filter((comment) => !comment.deletedAt);
}

function mapInlineCommentItemReactionsToCommentData(
  item: ResourceInlineCommentThread['items'][number]
): CommentReactionData[] {
  const groups = new Map<string, CommentReactionData>();
  item.reactions.forEach((reaction) => {
    const createdAt = normalizeOptionalInlineCommentDate(reaction.createTime) ?? new Date();
    const existing = groups.get(reaction.emojiId);
    if (existing) {
      existing.userIds.push(reaction.userId);
      if (createdAt.getTime() < existing.createdAt.getTime()) {
        existing.createdAt = createdAt;
      }
      return;
    }
    groups.set(reaction.emojiId, {
      emoji: reaction.emojiId,
      createdAt,
      userIds: [reaction.userId],
    });
  });
  return [...groups.values()];
}

function buildReactionUserInfoById(
  item: ResourceInlineCommentThread['items'][number]
): Record<string, unknown> {
  return Object.fromEntries(
    item.reactions
      .filter((reaction) => reaction.userInfo)
      .map((reaction) => [
        reaction.userId,
        reaction.userInfo as NonNullable<typeof reaction.userInfo>,
      ])
  );
}

function mapInlineCommentItemToCommentData(
  thread: ResourceInlineCommentThread,
  item: ResourceInlineCommentThread['items'][number]
): CommentData {
  const createdAt = normalizeInlineCommentDate(item.createTime);
  const updatedAt = item.updateTime ? normalizeInlineCommentDate(item.updateTime) : createdAt;
  return {
    type: 'comment',
    id: item.itemId,
    userId: item.authorId,
    createdAt,
    updatedAt,
    reactions: mapInlineCommentItemReactionsToCommentData(item),
    metadata: {
      inlineCommentId: thread.inlineCommentId,
      authorInfo: item.authorInfo,
      reactionUserInfoById: buildReactionUserInfoById(item),
    },
    body: buildTextInlineCommentBody(item.content),
  };
}

function mapInlineCommentThreadToThreadData(
  thread: ResourceInlineCommentThread
): PlainThreadRecord {
  const createdAt = normalizeInlineCommentDate(thread.createTime);
  const updatedAt = thread.updateTime ? normalizeInlineCommentDate(thread.updateTime) : createdAt;
  return {
    type: 'thread',
    id: thread.inlineCommentId,
    createdAt,
    updatedAt,
    comments: getVisibleInlineCommentData(
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

function readInlineCommentFromRaw(rawComment: unknown): CommentData | null {
  if (isGettableMapLike(rawComment)) {
    const createdAt = normalizeInlineCommentDate(rawComment.get('createdAt'));
    return {
      type: 'comment',
      id: String(rawComment.get('id') ?? ''),
      userId: String(rawComment.get('userId') ?? ''),
      createdAt,
      updatedAt: normalizeOptionalInlineCommentDate(rawComment.get('updatedAt')) ?? createdAt,
      deletedAt: normalizeOptionalInlineCommentDate(rawComment.get('deletedAt')),
      reactions: [],
      metadata: (rawComment.get('metadata') as Record<string, unknown> | undefined) ?? {},
      body: rawComment.get('body') as InlineCommentBody,
    };
  }

  if (!isRecord(rawComment)) {
    return null;
  }

  const comment = rawComment as CommentData;
  const createdAt = normalizeInlineCommentDate(comment.createdAt);
  return {
    ...comment,
    createdAt,
    updatedAt: normalizeOptionalInlineCommentDate(comment.updatedAt) ?? createdAt,
    deletedAt: normalizeOptionalInlineCommentDate(comment.deletedAt),
  };
}

function readThreadDataFromRaw(rawThread: unknown, fallbackId: string): ThreadData | null {
  if (isGettableMapLike(rawThread)) {
    const rawComments = rawThread.get('comments');
    const comments: CommentData[] = [];
    if (isGettableArrayLike(rawComments)) {
      for (let index = 0; index < rawComments.length; index += 1) {
        const comment = readInlineCommentFromRaw(rawComments.get(index));
        if (comment) {
          comments.push(comment);
        }
      }
    }
    const createdAt = normalizeInlineCommentDate(rawThread.get('createdAt'));
    return {
      type: 'thread',
      id: String(rawThread.get('id') ?? fallbackId),
      createdAt,
      updatedAt: normalizeOptionalInlineCommentDate(rawThread.get('updatedAt')) ?? createdAt,
      comments: getVisibleInlineCommentData(comments),
      resolved: Boolean(rawThread.get('resolved')),
      resolvedUpdatedAt: normalizeOptionalInlineCommentDate(rawThread.get('resolvedUpdatedAt')),
      resolvedBy: (rawThread.get('resolvedBy') as string | undefined) ?? undefined,
      metadata: (rawThread.get('metadata') as Record<string, unknown> | undefined) ?? {},
    };
  }

  if (!isRecord(rawThread)) {
    return null;
  }

  const thread = rawThread as ThreadData;
  const createdAt = normalizeInlineCommentDate(thread.createdAt);
  return {
    ...thread,
    id: thread.id || fallbackId,
    createdAt,
    updatedAt: normalizeOptionalInlineCommentDate(thread.updatedAt) ?? createdAt,
    resolvedUpdatedAt: normalizeOptionalInlineCommentDate(thread.resolvedUpdatedAt),
    comments: Array.isArray(thread.comments)
      ? getVisibleInlineCommentData(
          thread.comments.map((comment) => readInlineCommentFromRaw(comment)).filter(isCommentData)
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

export function syncRemoteInlineCommentThreadsToYjs(
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

function withoutUserReaction(
  reactions: CommentReactionData[],
  userId: string
): CommentReactionData[] {
  return reactions
    .map((reaction) => ({
      ...reaction,
      userIds: reaction.userIds.filter((id) => id !== userId),
    }))
    .filter((reaction) => reaction.userIds.length > 0);
}

function setUserReaction(
  reactions: CommentReactionData[],
  userId: string,
  emoji: string,
  createdAt: Date
): CommentReactionData[] {
  const nextReactions = withoutUserReaction(reactions, userId);
  const existing = nextReactions.find((reaction) => reaction.emoji === emoji);
  if (existing) {
    return nextReactions.map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            createdAt:
              createdAt.getTime() < reaction.createdAt.getTime() ? createdAt : reaction.createdAt,
            userIds: [...reaction.userIds, userId],
          }
        : reaction
    );
  }
  return [
    ...nextReactions,
    {
      emoji,
      createdAt,
      userIds: [userId],
    },
  ];
}

type InlineCommentMetadata = Record<string, unknown>;

type CreateThreadOptions = {
  initialComment: {
    body: InlineCommentBody;
    metadata?: InlineCommentMetadata;
  };
  metadata?: InlineCommentMetadata;
};

type AddCommentOptions = {
  threadId: string;
  comment: {
    body: InlineCommentBody;
    metadata?: InlineCommentMetadata;
  };
};

type UpdateCommentOptions = AddCommentOptions & {
  commentId: string;
};

type DeleteCommentOptions = {
  threadId: string;
  commentId: string;
};

type ResolveThreadOptions = {
  threadId: string;
};

export class RemoteInlineCommentThreadStore extends ThreadStore {
  private readonly resourceId: string;
  private readonly threadsYMap: Y.Map<unknown>;
  private readonly dataSource: RemoteInlineCommentDataSource;
  private readonly getActiveCommentUserId: () => string;
  private readonly getPendingReferenceText?: () => string | undefined;
  private readonly onThreadEmpty: (threadId: string) => void;

  public readonly addThreadToDocument: ThreadStore['addThreadToDocument'];

  public constructor(options: {
    resourceId: string;
    threadsYMap: Y.Map<unknown>;
    dataSource: RemoteInlineCommentDataSource;
    getActiveCommentUserId: () => string;
    getPendingReferenceText?: () => string | undefined;
    auth: ThreadStoreAuth;
    addThreadToDocument: NonNullable<ThreadStore['addThreadToDocument']>;
    onThreadEmpty: (threadId: string) => void;
  }) {
    super(options.auth);
    this.resourceId = options.resourceId;
    this.threadsYMap = options.threadsYMap;
    this.dataSource = options.dataSource;
    this.getActiveCommentUserId = options.getActiveCommentUserId;
    this.getPendingReferenceText = options.getPendingReferenceText;
    this.addThreadToDocument = options.addThreadToDocument;
    this.onThreadEmpty = options.onThreadEmpty;
  }

  public getThread(threadId: string): ThreadData {
    const thread = getThreadDataFromMap(this.threadsYMap, threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    return thread;
  }

  public getThreads(): Map<string, ThreadData> {
    return buildThreadSnapshot(this.threadsYMap);
  }

  public subscribe(subscriber: (threads: Map<string, ThreadData>) => void): () => void {
    const emit = () => subscriber(this.getThreads());
    emit();
    this.threadsYMap.observeDeep(emit);
    return () => this.threadsYMap.unobserveDeep(emit);
  }

  public async createThread(args: CreateThreadOptions): Promise<ThreadData> {
    const externalAnchorId = createLocalId('inline-anchor');
    const initialContent = extractPlainTextFromInlineCommentBody(args.initialComment.body);
    const referenceText =
      this.getPendingReferenceText?.() ??
      (typeof args.metadata?.referenceText === 'string' ? args.metadata.referenceText : undefined);
    const createdInlineCommentId = await this.dataSource.createInlineComment({
      resourceId: this.resourceId,
      externalAnchorId,
      quoteText: referenceText,
      content: initialContent,
      anchorPayload: {},
      imageUrls: [],
      mentionUserIds: [],
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);

    const latestThreads = await this.dataSource.listInlineComments({ resourceId: this.resourceId });
    const createdThreadFromApi = latestThreads.find(
      (thread) => thread.inlineCommentId === createdInlineCommentId
    );
    if (!createdThreadFromApi) {
      throw new Error('批注创建失败');
    }
    const createdThread = mapInlineCommentThreadToThreadData(createdThreadFromApi);
    setThreadDataToMap(this.threadsYMap, createdThread);
    return createdThread;
  }

  public async addComment(args: AddCommentOptions): Promise<CommentData> {
    const now = new Date();
    const createdItemId = await this.dataSource.addInlineCommentItem({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      content: extractPlainTextFromInlineCommentBody(args.comment.body),
      imageUrls: [],
      mentionUserIds: [],
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);

    const comment: CommentData = {
      type: 'comment',
      id: createdItemId,
      userId: this.getActiveCommentUserId(),
      createdAt: now,
      updatedAt: now,
      reactions: [],
      metadata: args.comment.metadata ?? {},
      body: args.comment.body,
    };
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      updatedAt: now,
      comments: [...thread.comments, comment],
    }));
    return comment;
  }

  public async updateComment(args: UpdateCommentOptions): Promise<void> {
    await this.dataSource.updateInlineCommentItem({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      itemId: args.commentId,
      content: extractPlainTextFromInlineCommentBody(args.comment.body),
      imageUrls: [],
      mentionUserIds: [],
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);
    const now = new Date();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      updatedAt: now,
      comments: thread.comments.map((comment) =>
        comment.id === args.commentId
          ? {
              ...comment,
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
  }

  public async deleteComment(args: DeleteCommentOptions): Promise<void> {
    const currentThread = this.getThread(args.threadId);
    const isLastComment = currentThread.comments.length === 1;
    await this.dataSource.deleteInlineCommentItem({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      itemId: args.commentId,
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);
    if (isLastComment) {
      this.threadsYMap.delete(args.threadId);
      this.onThreadEmpty(args.threadId);
      return;
    }
    const now = new Date();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      updatedAt: now,
      comments: thread.comments.filter((comment) => comment.id !== args.commentId),
    }));
  }

  public async deleteThread(): Promise<void> {
    throw new Error('当前后端暂不支持删除整条批注串');
  }

  public async resolveThread(args: ResolveThreadOptions): Promise<void> {
    await this.dataSource.changeInlineCommentResolveStatus({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      resolved: true,
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);
    const now = new Date();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      resolved: true,
      resolvedBy: this.getActiveCommentUserId(),
      resolvedUpdatedAt: now,
      updatedAt: now,
    }));
  }

  public async unresolveThread(args: ResolveThreadOptions): Promise<void> {
    await this.dataSource.changeInlineCommentResolveStatus({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      resolved: false,
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);
    const now = new Date();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      resolved: false,
      resolvedBy: undefined,
      resolvedUpdatedAt: undefined,
      updatedAt: now,
    }));
  }

  public async addReaction(args: ReactionArgs): Promise<void> {
    const now = new Date();
    await this.dataSource.setInlineCommentItemReaction({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      itemId: args.commentId,
      emojiId: args.emoji,
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);

    const userId = this.getActiveCommentUserId();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      comments: thread.comments.map((comment) =>
        comment.id === args.commentId
          ? {
              ...comment,
              reactions: setUserReaction(comment.reactions, userId, args.emoji, now),
            }
          : comment
      ),
    }));
  }

  public async deleteReaction(args: ReactionArgs): Promise<void> {
    await this.dataSource.deleteInlineCommentItemReaction({
      resourceId: this.resourceId,
      inlineCommentId: args.threadId,
      itemId: args.commentId,
    });
    invalidateRemoteInlineCommentSync(this.threadsYMap);

    const userId = this.getActiveCommentUserId();
    updateThreadInMap(this.threadsYMap, args.threadId, (thread) => ({
      ...thread,
      comments: thread.comments.map((comment) =>
        comment.id === args.commentId
          ? {
              ...comment,
              reactions: withoutUserReaction(comment.reactions, userId),
            }
          : comment
      ),
    }));
  }
}
