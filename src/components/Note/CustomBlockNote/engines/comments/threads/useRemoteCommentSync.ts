import { useMemoizedFn, useMount, useUpdateEffect } from 'ahooks';
import type * as Y from 'yjs';

import type { ResourceInlineCommentThread } from '@/domains/Resource';
import {
  getRemoteCommentSyncRevision,
  syncRemoteCommentThreadsToYjs,
} from './RemoteCommentThreadStore';

export function useRemoteCommentSync({
  enabled,
  resourceId,
  threadsYMap,
  listInlineComments,
}: {
  enabled: boolean;
  resourceId: string;
  threadsYMap: Y.Map<unknown>;
  listInlineComments: (params: { resourceId: string }) => Promise<ResourceInlineCommentThread[]>;
}): void {
  const syncRemoteCommentsFromServer = useMemoizedFn(() => {
    if (!enabled) {
      return;
    }
    const syncRevision = getRemoteCommentSyncRevision(threadsYMap);
    void listInlineComments({ resourceId })
      .then((threads) => {
        // 本地创建/删改期间发起的旧 list 响应不得回写，否则会误删 thread 并 prune 掉高亮锚点
        if (syncRevision !== getRemoteCommentSyncRevision(threadsYMap)) {
          return;
        }
        syncRemoteCommentThreadsToYjs(threadsYMap, threads);
      })
      .catch((error) => {
        console.warn('[WisePen] sync inline comments failed', error);
      });
  });

  useMount(() => {
    syncRemoteCommentsFromServer();
  });

  useUpdateEffect(() => {
    syncRemoteCommentsFromServer();
  }, [enabled, resourceId, listInlineComments, syncRemoteCommentsFromServer, threadsYMap]);
}
