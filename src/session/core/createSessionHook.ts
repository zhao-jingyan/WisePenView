import { useMemo, useSyncExternalStore } from 'react';

import type { StatusAdapter } from './StatusAdapter';
import type { RetryStrategy } from './RetryStrategy';
import { StatusManager } from './StatusManager';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { ConnectionInstance } from './SessionInstance';
import type { GatewayFactory } from './GatewayFactory';

/**
 * createConnectionHook is the hook to create a connection.
 * It is used to create a connection and return the status and data flow.
 * @example
 * const { manager, instance } = createConnectionHook('note-1');
 * manager.status;
 * instance;
 */
export type SessionUnitConfig = {
  retryStrategy?: RetryStrategy;
};

type SessionUnit<TInstance extends ConnectionInstance, TAdapter extends StatusAdapter> = {
  type: string;
  create: (id: string) => {
    instance: TInstance;
    adapter: TAdapter;
  };
  gateway: GatewayFactory<TInstance>;
  config?: SessionUnitConfig;
};

export function createSessionHook<
  TInstance extends ConnectionInstance,
  TAdapter extends StatusAdapter,
>(unit: SessionUnit<TInstance, TAdapter>) {
  const retryStrategy = unit.config?.retryStrategy;

  return (id: string) => {
    // create one connection tuple per hook instance (no shared pool)
    const session = useMemo(() => {
      const createdUnit = unit.create(id);
      const rawInstance = createdUnit.instance;
      const adapter = createdUnit.adapter;
      const manager = new StatusManager(adapter, retryStrategy);
      const instance = unit.gateway({
        status: () => manager.status,
        instance: rawInstance,
      });
      return { manager, instance };
    }, [id]);

    // subscribe status changes to trigger rerender for consumers reading manager.status
    useSyncExternalStore(session.manager.subscribe, () => session.manager.status);

    // when the hook is mounted, connect the connection
    // when the hook is unmounted, disconnect the connection
    // we don't want to depend on ahooks in this core, so we use a useEffectForce.
    useEffectForce(() => {
      void session.manager.connect();
      return () => {
        session.instance.dispose?.();
        void session.manager.disconnect();
      };
    }, [session]);

    return { manager: session.manager, instance: session.instance };
  };
}
