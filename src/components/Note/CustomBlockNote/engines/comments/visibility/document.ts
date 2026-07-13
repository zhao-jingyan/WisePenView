import type { Doc } from 'yjs';

/** 已持久化的 Yjs map 名保持稳定，代码语义只暴露文档可见性。 */
const BLOCKNOTE_YJS_COMMENT_VISIBILITY_MAP = 'comment-settings' as const;

const COLLABORATOR_VISIBILITY_KEY = 'collaboratorVisibility' as const;

export type CollaboratorCommentVisibility = 'all' | 'own_only';

export type DocumentCommentVisibility = {
  collaboratorVisibility: CollaboratorCommentVisibility;
};

export const DEFAULT_DOCUMENT_COMMENT_VISIBILITY: DocumentCommentVisibility = {
  collaboratorVisibility: 'all',
};

function normalizeCollaboratorVisibility(value: unknown): CollaboratorCommentVisibility | null {
  if (value === 'own_only' || value === 'all') {
    return value;
  }
  return null;
}

export function getDocumentCommentVisibilityMap(doc: Doc) {
  return doc.getMap<unknown>(BLOCKNOTE_YJS_COMMENT_VISIBILITY_MAP);
}

export function readDocumentCommentVisibility(doc: Doc): DocumentCommentVisibility {
  const stored = normalizeCollaboratorVisibility(
    getDocumentCommentVisibilityMap(doc).get(COLLABORATOR_VISIBILITY_KEY)
  );
  return stored ? { collaboratorVisibility: stored } : DEFAULT_DOCUMENT_COMMENT_VISIBILITY;
}

export function writeDocumentCommentVisibility(
  doc: Doc,
  visibility: DocumentCommentVisibility
): void {
  const map = getDocumentCommentVisibilityMap(doc);
  doc.transact(() => {
    map.set(COLLABORATOR_VISIBILITY_KEY, visibility.collaboratorVisibility);
  });
}
