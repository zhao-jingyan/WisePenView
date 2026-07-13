import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import {
  getRemoteCommentSyncRevision,
  invalidateRemoteCommentSync,
} from './RemoteCommentThreadStore';

describe('RemoteCommentThreadStore 同步 revision', () => {
  it('按文档隔离本地写入 revision', () => {
    const firstDocumentMap = new Y.Doc().getMap('threads');
    const secondDocumentMap = new Y.Doc().getMap('threads');

    invalidateRemoteCommentSync(firstDocumentMap);

    expect(getRemoteCommentSyncRevision(firstDocumentMap)).toBe(1);
    expect(getRemoteCommentSyncRevision(secondDocumentMap)).toBe(0);

    invalidateRemoteCommentSync(secondDocumentMap);
    expect(getRemoteCommentSyncRevision(firstDocumentMap)).toBe(1);
    expect(getRemoteCommentSyncRevision(secondDocumentMap)).toBe(1);
  });
});
