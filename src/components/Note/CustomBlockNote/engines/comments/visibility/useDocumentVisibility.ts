import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';
import type { Doc } from 'yjs';

import {
  DEFAULT_DOCUMENT_COMMENT_VISIBILITY,
  getDocumentCommentVisibilityMap,
  readDocumentCommentVisibility,
  writeDocumentCommentVisibility,
  type CollaboratorCommentVisibility,
  type DocumentCommentVisibility,
} from './document';

export function useDocumentCommentVisibility(doc: Doc | null | undefined) {
  const [visibility, setVisibility] = useState<DocumentCommentVisibility>(() =>
    doc ? readDocumentCommentVisibility(doc) : DEFAULT_DOCUMENT_COMMENT_VISIBILITY
  );
  const detachRef = useRef<(() => void) | null>(null);

  const attachDocListeners = (targetDoc: Doc) => {
    detachRef.current?.();

    const map = getDocumentCommentVisibilityMap(targetDoc);
    const sync = () => setVisibility(readDocumentCommentVisibility(targetDoc));

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
      setVisibility(DEFAULT_DOCUMENT_COMMENT_VISIBILITY);
      return;
    }
    attachDocListeners(doc);
  }, [doc]);

  useUnmount(() => {
    detachRef.current?.();
  });

  const setCollaboratorVisibility = useMemoizedFn(
    (collaboratorVisibility: CollaboratorCommentVisibility) => {
      if (!doc) {
        return;
      }
      const next = { collaboratorVisibility };
      setVisibility(next);
      writeDocumentCommentVisibility(doc, next);
    }
  );

  return { visibility, setCollaboratorVisibility };
}
