import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';
import type { Doc } from 'yjs';

import {
  DEFAULT_DOCUMENT_INLINE_COMMENT_VISIBILITY,
  getDocumentInlineCommentVisibilityMap,
  readDocumentInlineCommentVisibility,
  writeDocumentInlineCommentVisibility,
  type CollaboratorInlineCommentVisibility,
  type DocumentInlineCommentVisibility,
} from './document';

export function useDocumentInlineCommentVisibility(doc: Doc | null | undefined) {
  const [visibility, setVisibility] = useState<DocumentInlineCommentVisibility>(() =>
    doc ? readDocumentInlineCommentVisibility(doc) : DEFAULT_DOCUMENT_INLINE_COMMENT_VISIBILITY
  );
  const detachRef = useRef<(() => void) | null>(null);

  const attachDocListeners = (targetDoc: Doc) => {
    detachRef.current?.();

    const map = getDocumentInlineCommentVisibilityMap(targetDoc);
    const sync = () => setVisibility(readDocumentInlineCommentVisibility(targetDoc));

    map.observeDeep(sync);
    sync();

    detachRef.current = () => {
      map.unobserveDeep(sync);
      detachRef.current = null;
    };
  };

  useMount(() => {
    if (doc) {
      attachDocListeners(doc);
    }
  });

  useUpdateEffect(() => {
    if (!doc) {
      detachRef.current?.();
      setVisibility(DEFAULT_DOCUMENT_INLINE_COMMENT_VISIBILITY);
      return;
    }
    attachDocListeners(doc);
  }, [doc]);

  useUnmount(() => {
    detachRef.current?.();
  });

  const setCollaboratorVisibility = useMemoizedFn(
    (collaboratorVisibility: CollaboratorInlineCommentVisibility) => {
      if (!doc) {
        return;
      }
      const next = { collaboratorVisibility };
      setVisibility(next);
      writeDocumentInlineCommentVisibility(doc, next);
    }
  );

  return { visibility, setCollaboratorVisibility };
}
