import type { StatusAdapter } from './StatusAdapter';
import type { RetryStrategy } from './RetryStrategy';
import { RetryStrategies } from './RetryStrategy';
import type { Status } from './Status';

/**
 * StatusManager is the fsm manager of the connection status.
 * It gives upper layer a unified interface to manage the connection status.
 *
 * @example
 * const manager = new StatusManager(adapter, retryStrategy);
 * manager.connect();
 * manager.disconnect();
 * manager.status;
 * manager.isDataFlowAvailable;
 */

export class StatusManager {
  private readonly adapter: StatusAdapter;
  private readonly retryStrategy: RetryStrategy;
  private _status: Status = 'idle';
  private _retryCount = 0;
  private _lastDelay: number | undefined;
  private _retryTimerId: ReturnType<typeof setTimeout> | undefined;
  /** subscribe contract with useSyncExternalStore: only indicates "snapshot has changed", read status via `status` */
  private _subscribers = new Set<() => void>();

  // given adapter and retry strategy, initialize the connection manager
  constructor(
    adapter: StatusAdapter,
    retryStrategy: RetryStrategy = RetryStrategies.exponential()
  ) {
    this.adapter = adapter;
    this.retryStrategy = retryStrategy;

    // initialize the adapter, inject callbacks
    this.adapter.setup({
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onError: () => this.handleError(),
    });
  }

  // private methods
  private handleConnected() {
    this._retryCount = 0;
    this._lastDelay = undefined;
    this.updateStatus('connected');
  }

  private handleError() {
    if (this._status === 'disconnecting') return;
    this.startReconnecting();
  }

  private handleDisconnected() {
    if (this._status === 'disconnecting') {
      this.updateStatus('idle');
    } else {
      this.startReconnecting();
    }
  }

  private startReconnecting() {
    this.clearRetryTimer();
    const delay = this.retryStrategy.delay({
      retryCount: this._retryCount,
      lastDelay: this._lastDelay,
    });
    const allowSelfRecoverCount = Math.max(0, this.retryStrategy.allowSelfRecoverCount ?? 0);
    if (delay !== null) {
      // Keep short reconnects silent; expose reconnecting only after threshold.
      if (this._retryCount >= allowSelfRecoverCount) {
        this.updateStatus('reconnecting');
      }
      this._lastDelay = delay;

      this._retryTimerId = setTimeout(() => {
        console.log('startReconnecting', delay);
        this._retryTimerId = undefined;
        this._retryCount++;
        void this.adapter.open().catch(() => this.handleError());
      }, delay);
    } else {
      this.updateStatus('error');
    }
  }

  private clearRetryTimer() {
    if (this._retryTimerId !== undefined) {
      clearTimeout(this._retryTimerId);
      this._retryTimerId = undefined;
    }
  }

  // public methods
  public get isDataFlowAvailable(): boolean {
    return this._status === 'connected';
  }

  public get status(): Status {
    return this._status;
  }

  public async connect() {
    if (this._status === 'connected' || this._status === 'connecting') return;
    this.clearRetryTimer();
    this.updateStatus('connecting');
    try {
      await this.adapter.open();
    } catch {
      this.handleError();
    }
  }

  public async disconnect() {
    this.clearRetryTimer();
    this.updateStatus('disconnecting');
    try {
      await this.adapter.close();
    } catch {
      this.updateStatus('idle');
    }
  }

  public async retry() {
    if (this._status === 'disconnecting') return;
    this.clearRetryTimer();
    this._lastDelay = undefined;
    this._retryCount = 0;
    this.updateStatus('connecting');
    try {
      await this.adapter.open();
    } catch {
      this.handleError();
    }
  }

  private updateStatus(next: Status) {
    this._status = next;
    this._subscribers.forEach((fn) => fn());
  }

  /**
   * Subscribe to status changes (used internally and by useSyncExternalStore).
   * Always read the new state via `status`.
   * Uses an arrow function to ensure a stable reference on the instance, preventing `this` loss when passed as a callback.
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    this._subscribers.add(onStoreChange);
    return () => this._subscribers.delete(onStoreChange);
  };
}
