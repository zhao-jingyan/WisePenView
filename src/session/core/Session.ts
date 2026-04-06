/**
 * IConnection is the interface of the connection.
 * It is used to wrap the connection manager and data flow, and provide a unified interface to the upper layer.
 * @example
 * const connection = new NoteConnection('note-1');
 * connection.manager.connect();
 * connection.manager.disconnect();
 * connection.manager.status;
 * connection.manager.isDataFlowAvailable;
 */

import type { StatusManager } from './StatusManager';
import type { ConnectionInstance } from './SessionInstance';

export interface Session {
  readonly id: string;
  readonly manager: StatusManager;
  readonly instance: ConnectionInstance;
  dispose(): Promise<void>;
}
