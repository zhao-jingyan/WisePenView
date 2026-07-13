import type { ThreadData } from '@blocknote/core/comments';
import type * as Y from 'yjs';

import type {
  NoteCommentAnchor,
  NoteCommentAnchorFacet,
  NoteCommentPosition,
  NoteContentPlugin,
  NotePluginRegistry,
} from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  isThreadActive,
} from '../threads/yjs';
import { getHiddenThreadIdsForUser, type ThreadVisibilityScope } from '../visibility/filter';

export const CONTENT_COMMENT_YJS_ORIGIN = 'wisePenContentCommentSync';

const syncingDocuments = new WeakMap<Y.Doc, number>();

export function isContentCommentSyncing(doc: Y.Doc): boolean {
  return (syncingDocuments.get(doc) ?? 0) > 0;
}

interface ContentCommentAnchorEntry {
  ownerId: string;
  anchor: NoteCommentAnchor;
  facet: NoteCommentAnchorFacet;
}

function getDedicatedCommentOwner(
  registry: NotePluginRegistry,
  ownerId: string
): NoteContentPlugin | undefined {
  const owner = registry.contentPlugins.find((plugin) => plugin.id === ownerId);
  return owner?.comments.mode === 'dedicated' ? owner : undefined;
}

function getAnchorFacet(
  registry: NotePluginRegistry,
  ownerId: string
): NoteCommentAnchorFacet | undefined {
  const owner = getDedicatedCommentOwner(registry, ownerId);
  return owner?.comments.mode === 'dedicated' ? owner.comments.anchor : undefined;
}

export function getContentCommentAnchorStores(
  doc: Y.Doc,
  registry: NotePluginRegistry
): Y.Map<unknown>[] {
  const stores = new Set<Y.Map<unknown>>();
  registry.contentPlugins.forEach((owner) => {
    if (owner.comments.mode === 'dedicated') {
      stores.add(owner.comments.anchor.getStore(doc));
    }
  });
  return [...stores];
}

export function findContentCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  threadId: string
): ContentCommentAnchorEntry | undefined {
  for (const owner of registry.contentPlugins) {
    if (owner.comments.mode !== 'dedicated') continue;
    const facet = owner.comments.anchor;
    const anchor = facet.parse(facet.getStore(doc).get(threadId));
    if (anchor) {
      return { ownerId: owner.id, anchor, facet };
    }
  }
  return undefined;
}

function forEachContentCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  visitor: (threadId: string, entry: ContentCommentAnchorEntry) => void
): void {
  registry.contentPlugins.forEach((owner) => {
    if (owner.comments.mode !== 'dedicated') return;
    const facet = owner.comments.anchor;
    facet.getStore(doc).forEach((value, threadId) => {
      const anchor = facet.parse(value);
      if (anchor) {
        visitor(String(threadId), { ownerId: owner.id, anchor, facet });
      }
    });
  });
}

export function getContentCommentThreadIds(doc: Y.Doc, registry: NotePluginRegistry): Set<string> {
  const ids = new Set<string>();
  forEachContentCommentAnchor(doc, registry, (threadId) => ids.add(threadId));
  return ids;
}

export function persistContentCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  ownerId: string,
  threadId: string,
  value: NoteCommentAnchor
): boolean {
  const facet = getAnchorFacet(registry, ownerId);
  const anchor = facet?.parse(value);
  if (!facet || !anchor) {
    return false;
  }
  doc.transact(() => {
    facet.getStore(doc).set(threadId, anchor);
  }, CONTENT_COMMENT_YJS_ORIGIN);
  return true;
}

export function isContentCommentYjsTransaction(origin: unknown): boolean {
  return origin === CONTENT_COMMENT_YJS_ORIGIN;
}

function runWithContentCommentSync<T>(doc: Y.Doc, run: () => T): T {
  syncingDocuments.set(doc, (syncingDocuments.get(doc) ?? 0) + 1);
  try {
    return run();
  } finally {
    const depth = (syncingDocuments.get(doc) ?? 1) - 1;
    if (depth > 0) {
      syncingDocuments.set(doc, depth);
    } else {
      syncingDocuments.delete(doc);
    }
  }
}

function pruneContentCommentAnchors(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  threadsYMap: Y.Map<unknown>
): void {
  const staleThreadIds = new Set<string>();
  getContentCommentAnchorStores(doc, registry).forEach((store) => {
    store.forEach((_value, threadId) => {
      const thread = threadsYMap.get(threadId) as ThreadData | undefined;
      if (!isThreadActive(thread)) {
        staleThreadIds.add(String(threadId));
      }
    });
  });
  if (staleThreadIds.size === 0) return;
  doc.transact(() => {
    getContentCommentAnchorStores(doc, registry).forEach((store) => {
      staleThreadIds.forEach((threadId) => store.delete(threadId));
    });
  }, CONTENT_COMMENT_YJS_ORIGIN);
}

export function syncContentCommentAnchors(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  registry: NotePluginRegistry,
  visibilityScope: ThreadVisibilityScope
): void {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const referencesYMap = getBlockNoteThreadReferencesYMap(doc);
  pruneContentCommentAnchors(doc, registry, threadsYMap);

  const hiddenThreadIds = getHiddenThreadIdsForUser(
    Array.from(threadsYMap.values()) as ThreadData[],
    visibilityScope
  );

  runWithContentCommentSync(doc, () => {
    forEachContentCommentAnchor(doc, registry, (threadId, { anchor, facet }) => {
      const thread = threadsYMap.get(threadId) as ThreadData | undefined;
      if (!isThreadActive(thread) || hiddenThreadIds.has(threadId)) return;
      const position = facet.resolve(editor, anchor);
      if (!position) return;
      facet.syncMark?.(editor, threadId, anchor, position);
      const referenceText = facet.getReferenceText(editor, anchor);
      if (referenceText && referencesYMap.get(threadId) !== referenceText) {
        referencesYMap.set(threadId, referenceText);
      }
    });
  });
}

export function resolveContentCommentPositions(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  registry: NotePluginRegistry
): Map<string, NoteCommentPosition> {
  const positions = new Map<string, NoteCommentPosition>();
  forEachContentCommentAnchor(doc, registry, (threadId, { anchor, facet }) => {
    const position = facet.resolve(editor, anchor);
    if (position) positions.set(threadId, position);
  });
  return positions;
}
