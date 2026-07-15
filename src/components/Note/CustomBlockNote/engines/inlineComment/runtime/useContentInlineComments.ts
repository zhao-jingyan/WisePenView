import { CommentsExtension, type ThreadData } from '@blocknote/core/comments';
import { useExtensionState } from '@blocknote/react';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Doc } from 'yjs';

import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import {
  findContentInlineCommentAnchor,
  persistContentInlineCommentAnchor,
  resolveContentInlineCommentPositions,
  syncContentInlineCommentAnchors,
} from '../anchors/content';
import {
  applyPendingInlineCommentReference,
  capturePendingInlineCommentSelection,
  type PendingInlineCommentReference,
  type PendingInlineCommentSelection,
} from '../anchors/pendingInlineComment';
import {
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
  isThreadActive,
} from '../threads/yjs';
import type { CollaboratorInlineCommentVisibility } from '../visibility/document';
import {
  getHiddenInlineCommentThreadIdsForUser,
  type InlineCommentVisibilityScope,
} from '../visibility/filter';
import type {
  ContentInlineCommentTarget,
  StartContentInlineCommentOptions,
  UpdateContentInlineCommentReferenceOptions,
} from './InlineCommentRuntime';

interface PendingContentInlineCommentAnchor extends ContentInlineCommentTarget {
  existingThreadIds: Set<string>;
}

interface UseContentInlineCommentsOptions {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  registry: NotePluginRegistry;
  inlineCommentEnabled: boolean;
  inlineCommentWritable: boolean;
  readOnly: boolean;
  inlineCommentUserId: string;
  isInlineCommentVisibilityPrivileged: boolean;
  collaboratorVisibility: CollaboratorInlineCommentVisibility;
  pendingInlineCommentReferenceRef: RefObject<PendingInlineCommentReference | null>;
  pendingInlineCommentSelectionRef: RefObject<PendingInlineCommentSelection | null>;
  onOpenInlineComment: () => void;
}

function getInlineCommentExtension(editor: CustomBlockNoteEditor) {
  return editor.getExtension('comments') as { startPendingComment?: () => void } | undefined;
}

export function useContentInlineComments({
  editor,
  doc,
  registry,
  inlineCommentEnabled,
  inlineCommentWritable,
  readOnly,
  inlineCommentUserId,
  isInlineCommentVisibilityPrivileged,
  collaboratorVisibility,
  pendingInlineCommentReferenceRef,
  pendingInlineCommentSelectionRef,
  onOpenInlineComment,
}: UseContentInlineCommentsOptions) {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const threadReferencesYMap = getBlockNoteThreadReferencesYMap(doc);
  const pendingContentAnchorRef = useRef<PendingContentInlineCommentAnchor | null>(null);
  const syncingContentStateRef = useRef(false);
  const bumpScheduledRef = useRef(false);
  const [liveReferenceTexts, setLiveReferenceTexts] = useState(() => new Map<string, string>());
  const [referenceTextsRevision, setReferenceTextsRevision] = useState(0);
  const [contentRevision, setContentRevision] = useState(0);

  const buildVisibilityScope = (): InlineCommentVisibilityScope => ({
    currentUserId: inlineCommentUserId,
    isPrivileged: isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
  });

  const commitPendingInlineCommentReferenceForThread = useCallback(
    (threadId: string) => {
      const pending = pendingInlineCommentReferenceRef.current;
      if (!pending || pending.existingThreadIds.has(threadId)) return;
      threadReferencesYMap.set(threadId, pending.referenceText);
      pendingInlineCommentReferenceRef.current = null;
      setReferenceTextsRevision((revision) => revision + 1);
    },
    [pendingInlineCommentReferenceRef, threadReferencesYMap]
  );

  const applyPendingContentAnchor = () => {
    const pending = pendingContentAnchorRef.current;
    if (!pending) return;
    for (const threadId of threadsYMap.keys()) {
      const id = String(threadId);
      if (pending.existingThreadIds.has(id)) continue;
      persistContentInlineCommentAnchor(doc, registry, pending.ownerId, id, pending.anchor);
      pendingContentAnchorRef.current = null;
      return;
    }
  };

  const runContentStateSync = () => {
    if (syncingContentStateRef.current) return;
    if (pendingInlineCommentReferenceRef.current) {
      pendingInlineCommentReferenceRef.current = applyPendingInlineCommentReference(
        pendingInlineCommentReferenceRef.current,
        threadsYMap,
        threadReferencesYMap
      );
    }
    applyPendingContentAnchor();
    if (readOnly) return;
    syncingContentStateRef.current = true;
    try {
      syncContentInlineCommentAnchors(editor, doc, registry, buildVisibilityScope());
    } finally {
      syncingContentStateRef.current = false;
    }
  };

  const bumpInlineCommentState = () => {
    if (bumpScheduledRef.current) return;
    bumpScheduledRef.current = true;
    queueMicrotask(() => {
      bumpScheduledRef.current = false;
      runContentStateSync();
      setContentRevision((revision) => revision + 1);
    });
  };

  const rememberPendingInlineCommentReference = () => {
    if (!inlineCommentWritable || !inlineCommentEnabled) return;
    const selectedText = editor.getSelectedText().trim();
    const facetReference = registry.contentPlugins.reduce<string | undefined>((result, owner) => {
      if (result || owner.inlineComment.mode !== 'dedicated') return result;
      return owner.inlineComment.anchor.getSelectionReferenceText?.(editor);
    }, undefined);
    const referenceText = selectedText || facetReference;
    const selection = capturePendingInlineCommentSelection(editor);
    if (selection) pendingInlineCommentSelectionRef.current = selection;
    pendingInlineCommentReferenceRef.current = referenceText
      ? {
          referenceText,
          existingThreadIds: new Set(Array.from(threadsYMap.keys(), String)),
        }
      : null;
  };

  const startContentInlineComment = (options: StartContentInlineCommentOptions) => {
    if (!inlineCommentEnabled || !inlineCommentWritable || !options.referenceText.trim()) return;
    const owner = registry.contentPlugins.find((plugin) => plugin.id === options.ownerId);
    if (owner?.inlineComment.mode !== 'dedicated') return;
    const anchor = owner.inlineComment.anchor.parse(options.anchor);
    const commentsExtension = getInlineCommentExtension(editor);
    if (!anchor || !commentsExtension?.startPendingComment) return;

    const selection = capturePendingInlineCommentSelection(editor);
    if (selection) pendingInlineCommentSelectionRef.current = selection;
    const existingThreadIds = new Set(Array.from(threadsYMap.keys(), String));
    pendingInlineCommentReferenceRef.current = {
      referenceText: options.referenceText.trim(),
      existingThreadIds,
    };
    pendingContentAnchorRef.current = { ownerId: owner.id, anchor, existingThreadIds };

    if (!owner.inlineComment.anchor.select(editor, anchor)) {
      pendingInlineCommentReferenceRef.current = null;
      pendingContentAnchorRef.current = null;
      return;
    }
    editor.focus();
    onOpenInlineComment();
    commentsExtension.startPendingComment();
  };

  const findMatchingThreadIds = (target: ContentInlineCommentTarget): string[] => {
    const owner = registry.contentPlugins.find((plugin) => plugin.id === target.ownerId);
    if (owner?.inlineComment.mode !== 'dedicated') return [];
    const facet = owner.inlineComment.anchor;
    const anchor = facet.parse(target.anchor);
    if (!anchor) return [];
    const ids: string[] = [];
    facet.getStore(doc).forEach((value, threadId) => {
      const stored = facet.parse(value);
      if (stored && facet.equals(stored, anchor)) ids.push(String(threadId));
    });
    return ids;
  };

  const updateContentInlineCommentReference = (
    options: UpdateContentInlineCommentReferenceOptions
  ) => {
    if (!inlineCommentEnabled || !options.referenceText.trim()) return;
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

  const clearContentInlineCommentReferenceOverride = (target: ContentInlineCommentTarget) => {
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

  const inlineCommentThreadPositions = resolveContentInlineCommentPositions(editor, doc, registry);
  void contentRevision;
  const { selectedThreadId } = useExtensionState(CommentsExtension, { editor });

  const hasActiveContentInlineComment = (target: ContentInlineCommentTarget) => {
    const hiddenThreadIds = getHiddenInlineCommentThreadIdsForUser(
      Array.from(threadsYMap.values()) as ThreadData[],
      buildVisibilityScope()
    );
    return findMatchingThreadIds(target).some((threadId) => {
      if (hiddenThreadIds.has(threadId)) return false;
      return isThreadActive(threadsYMap.get(threadId) as ThreadData | undefined);
    });
  };

  const getThreadContentInlineCommentAnchor = (threadId: string) => {
    const entry = findContentInlineCommentAnchor(doc, registry, threadId);
    return entry ? { ownerId: entry.ownerId, anchor: entry.anchor } : undefined;
  };

  const isContentThreadSelected = (target: ContentInlineCommentTarget) => {
    if (!selectedThreadId) return false;
    const selected = findContentInlineCommentAnchor(doc, registry, selectedThreadId);
    return Boolean(
      selected &&
      selected.ownerId === target.ownerId &&
      selected.facet.equals(selected.anchor, target.anchor)
    );
  };

  return {
    runtimeProviderProps: {
      canInlineComment: inlineCommentEnabled && inlineCommentWritable,
      startContentInlineComment,
      updateContentInlineCommentReference,
      clearContentInlineCommentReferenceOverride,
      selectedThreadId,
      editor,
      hasActiveContentInlineComment,
      isContentThreadSelected,
      getThreadContentInlineCommentAnchor,
    },
    rememberPendingInlineCommentReference,
    commitPendingInlineCommentReferenceForThread,
    bumpInlineCommentState,
    visibleThreadReferenceTexts,
    inlineCommentThreadPositions,
  };
}
