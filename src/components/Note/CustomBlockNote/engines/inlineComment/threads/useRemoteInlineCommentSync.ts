import { useMemoizedFn, useMount, useUpdateEffect } from 'ahooks';
import type * as Y from 'yjs';

import type { ResourceInlineCommentThread } from '@/domains/Resource';
import {
  getRemoteInlineCommentSyncRevision,
  syncRemoteInlineCommentThreadsToYjs,
} from './RemoteInlineCommentThreadStore';

export function useRemoteInlineCommentSync({
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
  const syncRemoteInlineCommentsFromServer = useMemoizedFn(() => {
    if (!enabled) {
      return;
    }
    const syncRevision = getRemoteInlineCommentSyncRevision(threadsYMap);
    void listInlineComments({ resourceId })
      .then((threads) => {
        // 本地创建/删改期间发起的旧 list 响应不得回写，否则会误删 thread 并 prune 掉高亮锚点
        if (syncRevision !== getRemoteInlineCommentSyncRevision(threadsYMap)) {
          return;
        }
        syncRemoteInlineCommentThreadsToYjs(threadsYMap, threads);
      })
      .catch((error) => {
        console.warn('[WisePen] sync inline comments failed', error);
      });
  });

  useMount(() => {
    syncRemoteInlineCommentsFromServer();
  });

  useUpdateEffect(() => {
    syncRemoteInlineCommentsFromServer();
  }, [enabled, resourceId, listInlineComments, syncRemoteInlineCommentsFromServer, threadsYMap]);
}
