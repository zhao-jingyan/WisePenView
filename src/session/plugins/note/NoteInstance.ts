import type { ConnectionInstance } from '@/session/core/SessionInstance';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Doc } from 'yjs';
import * as Y from 'yjs';

import type { WisepenProvider } from './WisepenProvider';

export type NoteInstanceRuntime = {
  doc: Y.Doc;
  idb: IndexeddbPersistence;
  provider: WisepenProvider;
};

export class NoteInstance implements ConnectionInstance {
  private readonly yDoc: Y.Doc;
  private readonly idb: IndexeddbPersistence;
  private readonly wsProvider: WisepenProvider;

  constructor(runtime: NoteInstanceRuntime) {
    this.yDoc = runtime.doc;
    this.idb = runtime.idb;
    this.wsProvider = runtime.provider;
  }

  /**
   * 原始 provider 访问口；是否对外可用由 gateway 决定。
   */
  get provider(): WisepenProvider | null {
    return this.wsProvider;
  }

  /**
   * 当前笔记对应的 Y.Doc。
   */
  get doc(): Doc | null {
    return this.yDoc;
  }

  destroy(): void {
    this.wsProvider.destroy();
    void this.idb.destroy();
    this.yDoc.destroy();
  }

  sendIntent(operationType: Parameters<WisepenProvider['sendIntent']>[0], source?: string): void {
    this.wsProvider.sendIntent(operationType, source);
  }

  dispose(): void {}
}
