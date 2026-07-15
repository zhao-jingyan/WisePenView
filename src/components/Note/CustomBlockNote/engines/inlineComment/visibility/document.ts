import type { Doc } from 'yjs';

/** 已持久化的 Yjs map 名保持稳定，代码语义只暴露文档可见性。 */
const BLOCKNOTE_YJS_COMMENT_VISIBILITY_MAP = 'comment-settings' as const;

const COLLABORATOR_VISIBILITY_KEY = 'collaboratorVisibility' as const;

export type CollaboratorInlineCommentVisibility = 'all' | 'own_only';

export type DocumentInlineCommentVisibility = {
  collaboratorVisibility: CollaboratorInlineCommentVisibility;
};

export const DEFAULT_DOCUMENT_INLINE_COMMENT_VISIBILITY: DocumentInlineCommentVisibility = {
  collaboratorVisibility: 'all',
};

function normalizeCollaboratorInlineCommentVisibility(
  value: unknown
): CollaboratorInlineCommentVisibility | null {
  if (value === 'own_only' || value === 'all') {
    return value;
  }
  return null;
}

export function getDocumentInlineCommentVisibilityMap(doc: Doc) {
  return doc.getMap<unknown>(BLOCKNOTE_YJS_COMMENT_VISIBILITY_MAP);
}

export function readDocumentInlineCommentVisibility(doc: Doc): DocumentInlineCommentVisibility {
  const stored = normalizeCollaboratorInlineCommentVisibility(
    getDocumentInlineCommentVisibilityMap(doc).get(COLLABORATOR_VISIBILITY_KEY)
  );
  return stored ? { collaboratorVisibility: stored } : DEFAULT_DOCUMENT_INLINE_COMMENT_VISIBILITY;
}

export function writeDocumentInlineCommentVisibility(
  doc: Doc,
  visibility: DocumentInlineCommentVisibility
): void {
  const map = getDocumentInlineCommentVisibilityMap(doc);
  doc.transact(() => {
    map.set(COLLABORATOR_VISIBILITY_KEY, visibility.collaboratorVisibility);
  });
}
