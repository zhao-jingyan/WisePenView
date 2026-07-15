import type { ThreadData } from '@blocknote/core/comments';
import type * as Y from 'yjs';

import type {
  NoteContentPlugin,
  NoteInlineCommentAnchor,
  NoteInlineCommentAnchorFacet,
  NoteInlineCommentPosition,
  NotePluginRegistry,
} from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  isThreadActive,
} from '../threads/yjs';
import {
  getHiddenInlineCommentThreadIdsForUser,
  type InlineCommentVisibilityScope,
} from '../visibility/filter';

export const CONTENT_INLINE_COMMENT_YJS_ORIGIN = 'wisePenContentCommentSync';

const syncingDocuments = new WeakMap<Y.Doc, number>();

export function isContentInlineCommentSyncing(doc: Y.Doc): boolean {
  return (syncingDocuments.get(doc) ?? 0) > 0;
}

interface ContentInlineCommentAnchorEntry {
  ownerId: string;
  anchor: NoteInlineCommentAnchor;
  facet: NoteInlineCommentAnchorFacet;
}

function getDedicatedInlineCommentOwner(
  registry: NotePluginRegistry,
  ownerId: string
): NoteContentPlugin | undefined {
  const owner = registry.contentPlugins.find((plugin) => plugin.id === ownerId);
  return owner?.inlineComment.mode === 'dedicated' ? owner : undefined;
}

function getAnchorFacet(
  registry: NotePluginRegistry,
  ownerId: string
): NoteInlineCommentAnchorFacet | undefined {
  const owner = getDedicatedInlineCommentOwner(registry, ownerId);
  return owner?.inlineComment.mode === 'dedicated' ? owner.inlineComment.anchor : undefined;
}

export function getContentInlineCommentAnchorStores(
  doc: Y.Doc,
  registry: NotePluginRegistry
): Y.Map<unknown>[] {
  const stores = new Set<Y.Map<unknown>>();
  registry.contentPlugins.forEach((owner) => {
    if (owner.inlineComment.mode === 'dedicated') {
      stores.add(owner.inlineComment.anchor.getStore(doc));
    }
  });
  return [...stores];
}

export function findContentInlineCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  threadId: string
): ContentInlineCommentAnchorEntry | undefined {
  for (const owner of registry.contentPlugins) {
    if (owner.inlineComment.mode !== 'dedicated') continue;
    const facet = owner.inlineComment.anchor;
    const anchor = facet.parse(facet.getStore(doc).get(threadId));
    if (anchor) {
      return { ownerId: owner.id, anchor, facet };
    }
  }
  return undefined;
}

function forEachContentInlineCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  visitor: (threadId: string, entry: ContentInlineCommentAnchorEntry) => void
): void {
  registry.contentPlugins.forEach((owner) => {
    if (owner.inlineComment.mode !== 'dedicated') return;
    const facet = owner.inlineComment.anchor;
    facet.getStore(doc).forEach((value, threadId) => {
      const anchor = facet.parse(value);
      if (anchor) {
        visitor(String(threadId), { ownerId: owner.id, anchor, facet });
      }
    });
  });
}

export function getContentInlineCommentThreadIds(
  doc: Y.Doc,
  registry: NotePluginRegistry
): Set<string> {
  const ids = new Set<string>();
  forEachContentInlineCommentAnchor(doc, registry, (threadId) => ids.add(threadId));
  return ids;
}

export function persistContentInlineCommentAnchor(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  ownerId: string,
  threadId: string,
  value: NoteInlineCommentAnchor
): boolean {
  const facet = getAnchorFacet(registry, ownerId);
  const anchor = facet?.parse(value);
  if (!facet || !anchor) {
    return false;
  }
  doc.transact(() => {
    facet.getStore(doc).set(threadId, anchor);
  }, CONTENT_INLINE_COMMENT_YJS_ORIGIN);
  return true;
}

export function isContentInlineCommentYjsTransaction(origin: unknown): boolean {
  return origin === CONTENT_INLINE_COMMENT_YJS_ORIGIN;
}

function runWithContentInlineCommentSync<T>(doc: Y.Doc, run: () => T): T {
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

function pruneContentInlineCommentAnchors(
  doc: Y.Doc,
  registry: NotePluginRegistry,
  threadsYMap: Y.Map<unknown>
): void {
  const staleThreadIds = new Set<string>();
  getContentInlineCommentAnchorStores(doc, registry).forEach((store) => {
    store.forEach((_value, threadId) => {
      const thread = threadsYMap.get(threadId) as ThreadData | undefined;
      if (!isThreadActive(thread)) {
        staleThreadIds.add(String(threadId));
      }
    });
  });
  if (staleThreadIds.size === 0) return;
  doc.transact(() => {
    getContentInlineCommentAnchorStores(doc, registry).forEach((store) => {
      staleThreadIds.forEach((threadId) => store.delete(threadId));
    });
  }, CONTENT_INLINE_COMMENT_YJS_ORIGIN);
}

export function syncContentInlineCommentAnchors(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  registry: NotePluginRegistry,
  visibilityScope: InlineCommentVisibilityScope
): void {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const referencesYMap = getBlockNoteThreadReferencesYMap(doc);
  pruneContentInlineCommentAnchors(doc, registry, threadsYMap);

  const hiddenThreadIds = getHiddenInlineCommentThreadIdsForUser(
    Array.from(threadsYMap.values()) as ThreadData[],
    visibilityScope
  );

  runWithContentInlineCommentSync(doc, () => {
    forEachContentInlineCommentAnchor(doc, registry, (threadId, { anchor, facet }) => {
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

export function resolveContentInlineCommentPositions(
  editor: CustomBlockNoteEditor,
  doc: Y.Doc,
  registry: NotePluginRegistry
): Map<string, NoteInlineCommentPosition> {
  const positions = new Map<string, NoteInlineCommentPosition>();
  forEachContentInlineCommentAnchor(doc, registry, (threadId, { anchor, facet }) => {
    const position = facet.resolve(editor, anchor);
    if (position) positions.set(threadId, position);
  });
  return positions;
}
