import type { ConnectionInstance } from './SessionInstance';
import type { Status } from './Status';

export type GatewayFactory<TInstance extends ConnectionInstance> = (input: {
  status: () => Status;
  instance: TInstance;
}) => TInstance;
