import type { GatewayFactory } from '@/session/core/GatewayFactory';

import type { NoteInstance } from './NoteInstance';

export const NoteGateway: GatewayFactory<NoteInstance> = ({ status, instance }) => {
  const guardedSendIntent: NoteInstance['sendIntent'] = (operationType, source) => {
    if (status() !== 'connected') return;
    instance.sendIntent(operationType, source);
  };
  const canExposeProvider = (): boolean => {
    const current = status();
    return current === 'connected' || current === 'reconnecting';
  };

  return new Proxy(instance, {
    get(target, prop, receiver) {
      if (prop === 'provider') {
        return canExposeProvider() ? target.provider : null;
      }
      if (prop === 'sendIntent') {
        return guardedSendIntent;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
};
