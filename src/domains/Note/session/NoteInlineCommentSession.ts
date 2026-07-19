import type { IInlineCommentService, InlineCommentItem } from '@/domains/InlineComment';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { NoteInlineCommentDraft, NoteInlineCommentThread } from '../entity/inlineComment';
import { NoteInlineCommentServicesMap } from '../mapper/NoteInlineCommentServices.map';

export interface NoteInlineCommentSessionSnapshot {
  threads: readonly NoteInlineCommentThread[];
  resolvedThreads: readonly NoteInlineCommentThread[];
  loading: boolean;
  error?: unknown;
}

interface NoteInlineCommentSessionOptions {
  resourceId: string;
  inlineCommentService: IInlineCommentService;
}

function compareThreads(a: NoteInlineCommentThread, b: NoteInlineCommentThread): number {
  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt;
}

export class NoteInlineCommentSession {
  readonly resourceId: string;
  private readonly inlineCommentService: IInlineCommentService;
  private readonly threadsById = new Map<string, NoteInlineCommentThread>();
  private resolvedThreads: NoteInlineCommentThread[] = [];
  private readonly addedItemIdsByRequestKey = new Map<string, string>();
  private readonly subscribers = new Set<() => void>();
  private snapshot: NoteInlineCommentSessionSnapshot = {
    threads: [],
    resolvedThreads: [],
    loading: false,
  };
  private refreshPromise?: Promise<void>;
  private hasLoaded = false;
  private destroyed = false;

  constructor(options: NoteInlineCommentSessionOptions) {
    this.resourceId = options.resourceId;
    this.inlineCommentService = options.inlineCommentService;
  }

  getSnapshot = (): NoteInlineCommentSessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  destroy(): void {
    this.destroyed = true;
    this.subscribers.clear();
  }

  async createThread(
    params: NoteInlineCommentDraft & {
      content: string;
      imageUrls: string[];
      idempotencyKey: string;
    }
  ): Promise<NoteInlineCommentThread> {
    await this.refresh();
    const existingThread = this.findThreadByRequestKey(params.idempotencyKey);
    if (existingThread) return existingThread;

    const threadId = await this.inlineCommentService.createInlineComment(
      NoteInlineCommentServicesMap.mapCreateRequest({
        resourceId: this.resourceId,
        requestKey: params.idempotencyKey,
        draft: params,
        content: params.content,
        imageUrls: params.imageUrls,
      })
    );
    return this.reloadCreatedThread(threadId);
  }

  async addComment(
    threadId: string,
    content: string,
    imageUrls: string[],
    idempotencyKey: string
  ): Promise<InlineCommentItem> {
    const existingItemId = this.addedItemIdsByRequestKey.get(idempotencyKey);
    if (existingItemId) {
      await this.refresh();
      const existingItem = this.findItem(threadId, existingItemId);
      if (existingItem) return existingItem;
    }

    const itemId = await this.inlineCommentService.addInlineCommentItem(
      NoteInlineCommentServicesMap.mapAddItemRequest({
        resourceId: this.resourceId,
        threadId,
        content,
        imageUrls,
      })
    );
    this.addedItemIdsByRequestKey.set(idempotencyKey, itemId);
    return this.reloadCreatedItem(threadId, itemId);
  }

  async changeReaction(threadId: string, itemId: string, emojiId?: string): Promise<void> {
    if (emojiId) {
      await this.inlineCommentService.setInlineCommentItemReaction({
        resourceId: this.resourceId,
        inlineCommentId: threadId,
        itemId,
        emojiId,
      });
    } else {
      await this.inlineCommentService.deleteInlineCommentItemReaction({
        resourceId: this.resourceId,
        inlineCommentId: threadId,
        itemId,
      });
    }
    await this.refreshAfterMutation();
  }

  async deleteComment(threadId: string, itemId: string): Promise<void> {
    await this.inlineCommentService.deleteInlineCommentItem({
      resourceId: this.resourceId,
      inlineCommentId: threadId,
      itemId,
    });
    await this.refreshAfterMutation();
  }

  async resolveThread(threadId: string): Promise<void> {
    await this.inlineCommentService.changeInlineCommentResolveStatus({
      resourceId: this.resourceId,
      inlineCommentId: threadId,
      resolved: true,
    });
    await this.refreshAfterMutation();
  }

  async reopenThread(threadId: string): Promise<void> {
    await this.inlineCommentService.changeInlineCommentResolveStatus({
      resourceId: this.resourceId,
      inlineCommentId: threadId,
      resolved: false,
    });
    await this.refreshAfterMutation();
  }

  refresh(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.hasLoaded) this.updateSnapshot({ loading: true, error: undefined });
    this.refreshPromise = this.loadThreads()
      .then(() => {
        if (this.destroyed) return;
        this.hasLoaded = true;
        this.publish({ loading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!this.destroyed) this.updateSnapshot({ loading: false, error });
        throw error;
      })
      .finally(() => {
        this.refreshPromise = undefined;
      });
    return this.refreshPromise;
  }

  private async loadThreads(): Promise<void> {
    if (this.destroyed) return;
    const [activeThreads, resolvedThreads] = await Promise.all([
      this.inlineCommentService.listInlineComments({
        resourceId: this.resourceId,
        resolved: false,
      }),
      this.inlineCommentService.listInlineComments({
        resourceId: this.resourceId,
        resolved: true,
      }),
    ]);
    if (this.destroyed) return;
    this.threadsById.clear();
    NoteInlineCommentServicesMap.mapThreads(activeThreads).forEach((thread) =>
      this.threadsById.set(thread.threadId, thread)
    );
    this.resolvedThreads = NoteInlineCommentServicesMap.mapThreads(resolvedThreads);
  }

  private async reloadCreatedThread(threadId: string): Promise<NoteInlineCommentThread> {
    await this.refreshAfterMutation();
    let thread = this.threadsById.get(threadId);
    if (!thread) {
      await this.refresh();
      thread = this.threadsById.get(threadId);
    }
    if (!thread) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `新建批注 ${threadId} 未出现在资源批注列表中`,
      });
    }
    return thread;
  }

  private async reloadCreatedItem(threadId: string, itemId: string): Promise<InlineCommentItem> {
    await this.refreshAfterMutation();
    let item = this.findItem(threadId, itemId);
    if (!item) {
      await this.refresh();
      item = this.findItem(threadId, itemId);
    }
    if (!item) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `新建批注消息 ${itemId} 未出现在资源批注列表中`,
      });
    }
    return item;
  }

  private findThreadByRequestKey(requestKey: string): NoteInlineCommentThread | undefined {
    return [...this.threadsById.values()].find((thread) => thread.externalAnchorId === requestKey);
  }

  private findItem(threadId: string, itemId: string): InlineCommentItem | undefined {
    return this.threadsById.get(threadId)?.items.find((comment) => comment.itemId === itemId);
  }

  private async refreshAfterMutation(): Promise<void> {
    if (this.refreshPromise) {
      await this.refreshPromise.catch(() => undefined);
    }
    await this.refresh();
  }

  private updateSnapshot(patch: Partial<NoteInlineCommentSessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.subscribers.forEach((listener) => listener());
  }

  private publish(patch: Partial<NoteInlineCommentSessionSnapshot> = {}): void {
    this.updateSnapshot({
      threads: [...this.threadsById.values()].sort(compareThreads),
      resolvedThreads: [...this.resolvedThreads].sort(compareThreads),
      ...patch,
    });
  }
}
