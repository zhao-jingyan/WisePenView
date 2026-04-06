/**
 * ConnectionStatus is the status of the connection manager fsm.
 */

export type Status =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'disconnecting';
