import { useMemo, useSyncExternalStore } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { useEffectForce } from '@/hooks/useEffectForce';

import { NoteSaveStatusObserver } from './NoteSaveStatusObserver';
import { NoteStatusObserver } from './NoteStatusObserver';
import { WisepenProvider } from './WisepenProvider';

/** y-indexeddb 存储键：单条笔记一个 room，与 resourceId 对应（不承诺离线冷启动可打开） */
export function noteYjsIdbRoomName(resourceId: string): string {
  return `wisepen-note:${resourceId}`;
}

type IndexeddbSyncedObservable = {
  synced: boolean;
  on: (name: 'synced', fn: () => void) => void;
  off: (name: 'synced', fn: () => void) => void;
};

class NoteIndexeddbSyncObserver {
  private _synced: boolean;
  private readonly _subscribers = new Set<() => void>();
  private _detach: (() => void) | null = null;

  constructor(idb: IndexeddbPersistence) {
    const observable = idb as IndexeddbPersistence & IndexeddbSyncedObservable;
    this._synced = observable.synced;

    const handleSynced = () => {
      this.updateSynced(true);
    };

    observable.on('synced', handleSynced);
    this._detach = () => observable.off('synced', handleSynced);
  }

  detach(): void {
    this._detach?.();
    this._detach = null;
    this._subscribers.clear();
  }

  private updateSynced(next: boolean): void {
    if (this._synced === next) return;
    this._synced = next;
    this._subscribers.forEach((fn) => fn());
  }

  getSnapshot = (): boolean => this._synced;

  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}

export interface UseNoteSessionOptions {
  actorUserId?: string;
  enabled?: boolean;
}

export function useNoteSession(resourceId: string, options: UseNoteSessionOptions = {}) {
  const { actorUserId, enabled = true } = options;
  const session = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new WisepenProvider(resourceId, doc, { connect: false, actorUserId });
    const idb = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), doc);
    const observer = new NoteStatusObserver();
    const saveObserver = new NoteSaveStatusObserver();
    const idbObserver = new NoteIndexeddbSyncObserver(idb);
    observer.attach(provider);
    saveObserver.attach(doc, provider);

    const reconnect = () => {
      observer.setConnecting();
      provider.disconnect();
      provider.connect();
    };

    const destroy = () => {
      observer.detach();
      saveObserver.detach();
      idbObserver.detach();
      provider.destroy();
      void idb.destroy();
      doc.destroy();
    };

    return { doc, provider, observer, saveObserver, idbObserver, reconnect, destroy };
  }, [actorUserId, resourceId]);

  const status = useSyncExternalStore(session.observer.subscribe, session.observer.getSnapshot);
  const saveStatus = useSyncExternalStore(
    session.saveObserver.subscribe,
    session.saveObserver.getSnapshot
  );
  const idbSynced = useSyncExternalStore(
    session.idbObserver.subscribe,
    session.idbObserver.getSnapshot
  );

  /**
   * 执行时机：resourceId 变化生成新的协同 session 后，连接 WebSocket/Yjs provider。
   * 不可替代原因：provider、IndexedDB 持久化和 Y.Doc 都是外部资源，必须在挂载后建立并在卸载时释放。
   * cleanup：断开 provider、销毁 IndexedDB persistence、observer 与 Y.Doc，避免同一笔记残留连接。
   */
  useEffectForce(() => {
    if (enabled) {
      session.provider.connect();
    }
    return () => {
      session.destroy();
    };
  }, [enabled, session]);

  return {
    status,
    saveStatus,
    doc: session.doc,
    provider: session.provider,
    reconnect: session.reconnect,
    idbSynced,
  };
}
