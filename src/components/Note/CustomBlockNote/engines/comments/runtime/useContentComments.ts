import { CommentsExtension, type ThreadData } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Doc } from 'yjs';

import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  findContentCommentAnchor,
  persistContentCommentAnchor,
  resolveContentCommentPositions,
  syncContentCommentAnchors,
} from '../anchors/content';
import {
  applyPendingCommentReference,
  capturePendingCommentSelection,
  type PendingCommentReference,
  type PendingCommentSelection,
} from '../anchors/pending';
import {
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  isThreadActive,
} from '../threads/yjs';
import type { CollaboratorCommentVisibility } from '../visibility/document';
import { getHiddenThreadIdsForUser, type ThreadVisibilityScope } from '../visibility/filter';
import type {
  ContentCommentTarget,
  StartContentCommentOptions,
  UpdateContentCommentReferenceOptions,
} from './CommentRuntime';

interface PendingContentCommentAnchor extends ContentCommentTarget {
  existingThreadIds: Set<string>;
}

interface UseContentCommentsOptions {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  registry: NotePluginRegistry;
  commentsEnabled: boolean;
  commentsWritable: boolean;
  readOnly: boolean;
  commentUserId: string;
  isCommentVisibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorCommentVisibility;
  pendingCommentReferenceRef: RefObject<PendingCommentReference | null>;
  pendingCommentSelectionRef: RefObject<PendingCommentSelection | null>;
  onOpenComments: () => void;
}

function getCommentsExtension(editor: CustomBlockNoteEditor) {
  return editor.getExtension('comments') as { startPendingComment?: () => void } | undefined;
}

export function useContentComments({
  editor,
  doc,
  registry,
  commentsEnabled,
  commentsWritable,
  readOnly,
  commentUserId,
  isCommentVisibilityPrivileged,
  collaboratorVisibility,
  pendingCommentReferenceRef,
  pendingCommentSelectionRef,
  onOpenComments,
}: UseContentCommentsOptions) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const threadReferencesYMap = getBlockNoteThreadReferencesYMap(doc);
  const pendingContentAnchorRef = useRef<PendingContentCommentAnchor | null>(null);
  const syncingContentStateRef = useRef(false);
  const bumpScheduledRef = useRef(false);
  const [liveReferenceTexts, setLiveReferenceTexts] = useState(() => new Map<string, string>());
  const [referenceTextsRevision, setReferenceTextsRevision] = useState(0);
  const [contentRevision, setContentRevision] = useState(0);

  const buildVisibilityScope = (): ThreadVisibilityScope => ({
    currentUserId: commentUserId,
    isPrivileged: isCommentVisibilityPrivileged,
    collaboratorVisibility,
  });

  const commitPendingReferenceForThread = useCallback(
    (threadId: string) => {
      const pending = pendingCommentReferenceRef.current;
      if (!pending || pending.existingThreadIds.has(threadId)) return;
      threadReferencesYMap.set(threadId, pending.referenceText);
      pendingCommentReferenceRef.current = null;
      setReferenceTextsRevision((revision) => revision + 1);
    },
    [pendingCommentReferenceRef, threadReferencesYMap]
  );

  const applyPendingContentAnchor = () => {
    const pending = pendingContentAnchorRef.current;
    if (!pending) return;
    for (const threadId of threadsYMap.keys()) {
      const id = String(threadId);
      if (pending.existingThreadIds.has(id)) continue;
      persistContentCommentAnchor(doc, registry, pending.ownerId, id, pending.anchor);
      pendingContentAnchorRef.current = null;
      return;
    }
  };

  const runContentStateSync = () => {
    if (syncingContentStateRef.current) return;
    if (pendingCommentReferenceRef.current) {
      pendingCommentReferenceRef.current = applyPendingCommentReference(
        pendingCommentReferenceRef.current,
        threadsYMap,
        threadReferencesYMap
      );
    }
    applyPendingContentAnchor();
    if (readOnly) return;
    syncingContentStateRef.current = true;
    try {
      syncContentCommentAnchors(editor, doc, registry, buildVisibilityScope());
    } finally {
      syncingContentStateRef.current = false;
    }
  };

  const bumpContentState = () => {
    if (bumpScheduledRef.current) return;
    bumpScheduledRef.current = true;
    queueMicrotask(() => {
      bumpScheduledRef.current = false;
      runContentStateSync();
      setContentRevision((revision) => revision + 1);
    });
  };

  const rememberPendingCommentReference = () => {
    if (!commentsWritable || !commentsEnabled) return;
    const selectedText = editor.getSelectedText().trim();
    const facetReference = registry.contentPlugins.reduce<string | undefined>((result, owner) => {
      if (result || owner.comments.mode !== 'dedicated') return result;
      return owner.comments.anchor.getSelectionReferenceText?.(editor);
    }, undefined);
    const referenceText = selectedText || facetReference;
    const selection = capturePendingCommentSelection(editor);
    if (selection) pendingCommentSelectionRef.current = selection;
    pendingCommentReferenceRef.current = referenceText
      ? {
          referenceText,
          existingThreadIds: new Set(Array.from(threadsYMap.keys(), String)),
        }
      : null;
  };

  const startContentComment = (options: StartContentCommentOptions) => {
    if (!commentsEnabled || !commentsWritable || !options.referenceText.trim()) return;
    const owner = registry.contentPlugins.find((plugin) => plugin.id === options.ownerId);
    if (owner?.comments.mode !== 'dedicated') return;
    const anchor = owner.comments.anchor.parse(options.anchor);
    const commentsExtension = getCommentsExtension(editor);
    if (!anchor || !commentsExtension?.startPendingComment) return;

    const selection = capturePendingCommentSelection(editor);
    if (selection) pendingCommentSelectionRef.current = selection;
    const existingThreadIds = new Set(Array.from(threadsYMap.keys(), String));
    pendingCommentReferenceRef.current = {
      referenceText: options.referenceText.trim(),
      existingThreadIds,
    };
    pendingContentAnchorRef.current = { ownerId: owner.id, anchor, existingThreadIds };

    if (!owner.comments.anchor.select(editor, anchor)) {
      pendingCommentReferenceRef.current = null;
      pendingContentAnchorRef.current = null;
      return;
    }
    editor.focus();
    onOpenComments();
    commentsExtension.startPendingComment();
  };

  const findMatchingThreadIds = (target: ContentCommentTarget): string[] => {
    const owner = registry.contentPlugins.find((plugin) => plugin.id === target.ownerId);
    if (owner?.comments.mode !== 'dedicated') return [];
    const facet = owner.comments.anchor;
    const anchor = facet.parse(target.anchor);
    if (!anchor) return [];
    const ids: string[] = [];
    facet.getStore(doc).forEach((value, threadId) => {
      const stored = facet.parse(value);
      if (stored && facet.equals(stored, anchor)) ids.push(String(threadId));
    });
    return ids;
  };

  const updateContentCommentReference = (options: UpdateContentCommentReferenceOptions) => {
    if (!commentsEnabled || !options.referenceText.trim()) return;
    const matchingThreadIds = findMatchingThreadIds(options);
    const referenceText = options.referenceText.trim();
    if (options.persist) {
      matchingThreadIds.forEach((threadId) => threadReferencesYMap.set(threadId, referenceText));
    }
    setLiveReferenceTexts((current) => {
      let next: Map<string, string> | null = null;
      matchingThreadIds.forEach((threadId) => {
        if (current.get(threadId) !== referenceText) {
          next ??= new Map(current);
          next.set(threadId, referenceText);
        }
      });
      return next ?? current;
    });
  };

  const clearContentCommentReferenceOverride = (target: ContentCommentTarget) => {
    const matchingThreadIds = findMatchingThreadIds(target);
    setLiveReferenceTexts((current) => {
      const next = new Map(current);
      matchingThreadIds.forEach((threadId) => next.delete(threadId));
      return next.size === current.size ? current : next;
    });
  };

  const visibleThreadReferenceTexts = (() => {
    void referenceTextsRevision;
    const references = new Map<string, string>();
    threadReferencesYMap.forEach((text, threadId) => references.set(String(threadId), text));
    liveReferenceTexts.forEach((text, threadId) => references.set(threadId, text));
    return references;
  })();

  const contentThreadPositions = resolveContentCommentPositions(editor, doc, registry);
  void contentRevision;
  const { selectedThreadId } = useExtensionState(CommentsExtension, { editor });

  const hasActiveContentComment = (target: ContentCommentTarget) => {
    const hiddenThreadIds = getHiddenThreadIdsForUser(
      Array.from(threadsYMap.values()) as ThreadData[],
      buildVisibilityScope()
    );
    return findMatchingThreadIds(target).some((threadId) => {
      if (hiddenThreadIds.has(threadId)) return false;
      return isThreadActive(threadsYMap.get(threadId) as ThreadData | undefined);
    });
  };

  const getThreadContentAnchor = (threadId: string) => {
    const entry = findContentCommentAnchor(doc, registry, threadId);
    return entry ? { ownerId: entry.ownerId, anchor: entry.anchor } : undefined;
  };

  const isContentThreadSelected = (target: ContentCommentTarget) => {
    if (!selectedThreadId) return false;
    const selected = findContentCommentAnchor(doc, registry, selectedThreadId);
    return Boolean(
      selected &&
      selected.ownerId === target.ownerId &&
      selected.facet.equals(selected.anchor, target.anchor)
    );
  };

  return {
    runtimeProviderProps: {
      canComment: commentsEnabled && commentsWritable,
      startContentComment,
      updateContentCommentReference,
      clearContentCommentReferenceOverride,
      selectedThreadId,
      editor,
      hasActiveContentComment,
      isContentThreadSelected,
      getThreadContentAnchor,
    },
    rememberPendingCommentReference,
    commitPendingReferenceForThread,
    bumpContentState,
    visibleThreadReferenceTexts,
    contentThreadPositions,
  };
}
