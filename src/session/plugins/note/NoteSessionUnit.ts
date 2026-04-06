import { createSessionHook } from '@/session/core/createSessionHook';
import { RetryStrategies } from '@/session/core/RetryStrategy';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { NoteAdapter } from './NoteAdapter';
import { NoteGateway } from './NoteGateway';
import { NoteInstance } from './NoteInstance';
import { noteYjsIdbRoomName } from './idbRoom';
import { WisepenProvider } from './WisepenProvider';

export const NoteConnectionUnit = {
  type: 'note',
  create: (resourceId: string) => {
    const doc = new Y.Doc();
    const provider = new WisepenProvider(resourceId, doc, { connect: false });
    const idb = new IndexeddbPersistence(noteYjsIdbRoomName(resourceId), doc);
    const instance = new NoteInstance({ doc, provider, idb });
    const adapter = new NoteAdapter(instance, provider);
    return { instance, adapter };
  },
  gateway: NoteGateway,
  config: {
    retryStrategy: RetryStrategies.exponential(1000, 30000, 5, 3),
  },
} as const;

export const useNoteConnection = createSessionHook(NoteConnectionUnit);
