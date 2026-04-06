import type { StatusAdapter } from '@/session/core/StatusAdapter';

import type { NoteInstance } from './NoteInstance';
import type { WisepenProvider } from './WisepenProvider';

/** y-websocket 运行时混入 Observable 的 on/off；类型声明不完整，仅描述本类订阅所需形状 */
type YWebSocketObservable = {
  on: (name: string, fn: (...args: unknown[]) => void) => void;
  off: (name: string, fn: (...args: unknown[]) => void) => void;
};

function parseYWebsocketStatusPayload(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object' && 'status' in arg) {
    return String((arg as { status: unknown }).status);
  }
  return '';
}

const SESSION_CONNECT_TIMEOUT_MS = 5_000;

/**
 * 笔记协同：`StatusAdapter` 门面，消费 `NoteInstance` 提供的协同 runtime。
 * 重连由 `StatusManager` 调度 `open()`。
 */
export class NoteAdapter implements StatusAdapter {
  private readonly instance: NoteInstance;
  private readonly provider: WisepenProvider;
  private hooks: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (err: unknown) => void;
  } | null = null;

  private connectTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly detachListeners: Array<() => void> = [];
  private listenersAttached = false;

  constructor(instance: NoteInstance, provider: WisepenProvider) {
    this.instance = instance;
    this.provider = provider;
  }

  setup(hooks: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (err: unknown) => void;
  }): void {
    this.hooks = hooks;
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutId !== undefined) {
      window.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = undefined;
    }
  }

  private attachProviderListeners(): void {
    if (!this.hooks || this.listenersAttached) return;
    const observable = this.provider as unknown as YWebSocketObservable;
    const hooks = this.hooks;

    const onStatus = (...args: unknown[]) => {
      const status = parseYWebsocketStatusPayload(args[0]);
      if (status === 'disconnected') {
        hooks.onDisconnected();
      }
    };

    const onSync = (...args: unknown[]) => {
      if (args[0] !== false) {
        this.clearConnectTimeout();
        hooks.onConnected();
      }
    };

    const onConnectionError = (...args: unknown[]) => {
      this.clearConnectTimeout();
      hooks.onError(args[0] ?? new Error('connection-error'));
    };

    observable.on('status', onStatus);
    observable.on('sync', onSync);
    observable.on('connection-error', onConnectionError);
    this.listenersAttached = true;

    this.detachListeners.push(() => {
      observable.off('status', onStatus);
      observable.off('sync', onSync);
      observable.off('connection-error', onConnectionError);
      this.listenersAttached = false;
    });
  }

  private startConnectTimeout(): void {
    this.clearConnectTimeout();
    this.connectTimeoutId = window.setTimeout(() => {
      this.connectTimeoutId = undefined;
      this.hooks?.onError(new Error('SESSION_CONNECT_TIMEOUT'));
    }, SESSION_CONNECT_TIMEOUT_MS);
  }

  async open(): Promise<void> {
    if (!this.hooks) return;
    this.attachProviderListeners();
    this.startConnectTimeout();
    this.provider.connect();
  }

  async close(): Promise<void> {
    this.clearConnectTimeout();
    this.detachListeners.splice(0).forEach((detach) => detach());
    this.instance.destroy();
  }
}
