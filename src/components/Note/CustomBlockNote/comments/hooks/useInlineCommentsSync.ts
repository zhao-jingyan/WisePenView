import { useMemoizedFn, useMount, useUpdateEffect } from 'ahooks';
import type * as Y from 'yjs';

import type { ResourceInlineCommentThread } from '@/domains/Resource';
import { syncInlineCommentThreadsToYjs } from '../core/inlineCommentThreadStore';

export function useInlineCommentsSync({
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
  const syncInlineCommentsFromServer = useMemoizedFn(() => {
    if (!enabled) {
      return;
    }
    void listInlineComments({ resourceId })
      .then((threads) => {
        syncInlineCommentThreadsToYjs(threadsYMap, threads);
      })
      .catch((error) => {
        console.warn('[WisePen] sync inline comments failed', error);
      });
  });

  useMount(() => {
    syncInlineCommentsFromServer();
  });

  useUpdateEffect(() => {
    syncInlineCommentsFromServer();
  }, [enabled, resourceId, listInlineComments, syncInlineCommentsFromServer, threadsYMap]);
}
