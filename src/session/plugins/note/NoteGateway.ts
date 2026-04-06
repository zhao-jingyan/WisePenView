import type { GatewayFactory } from '@/session/core/GatewayFactory';

import type { NoteInstance } from './NoteInstance';

export const NoteGateway: GatewayFactory<NoteInstance> = ({ status, instance }) => {
  const guardedSendIntent: NoteInstance['sendIntent'] = (operationType, source) => {
    if (status() !== 'connected') return;
    instance.sendIntent(operationType, source);
  };

  return new Proxy(instance, {
    get(target, prop, receiver) {
      if (prop === 'provider') {
        return target.provider;
      }
      if (prop === 'sendIntent') {
        return guardedSendIntent;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
};
