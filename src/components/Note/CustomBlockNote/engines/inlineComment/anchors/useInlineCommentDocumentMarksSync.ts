import { useMount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';
import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/domains/Note';
import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { getBlockNoteThreadsYMap } from '../threads/yjs';
import type { CollaboratorInlineCommentVisibility } from '../visibility/document';
import type { InlineCommentVisibilityScope } from '../visibility/filter';
import {
  getContentInlineCommentAnchorStores,
  getContentInlineCommentThreadIds,
  isContentInlineCommentSyncing,
} from './content';
import {
  getBlockNoteThreadDocumentSelectionsYMap,
  hasInlineCommentDocumentYjsBinding,
  syncPlainTextInlineCommentDocumentMarks,
} from './range';

type UseSyncInlineCommentDocumentMarksOptions = {
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  doc: Doc;
  provider: WisepenProvider;
  inlineCommentEnabled: boolean;
  inlineCommentUserId?: string;
  isInlineCommentVisibilityPrivileged?: boolean;
  collaboratorVisibility?: CollaboratorInlineCommentVisibility;
  onAfterDocumentMarksSync?: () => void;
};

const BINDING_RETRY_DELAY_MS = 50;
const BINDING_RETRY_LIMIT = 20;

export function useSyncInlineCommentDocumentMarks({
  editor,
  registry,
  doc,
  provider,
  inlineCommentEnabled,
  inlineCommentUserId = '',
  isInlineCommentVisibilityPrivileged = false,
  collaboratorVisibility = 'all',
  onAfterDocumentMarksSync,
}: UseSyncInlineCommentDocumentMarksOptions) {
  const hasSyncedRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);
  const firstSyncFrameRef = useRef<number | null>(null);
  const secondSyncFrameRef = useRef<number | null>(null);
  const bindingRetryTimerRef = useRef<number | null>(null);
  const bindingRetryCountRef = useRef(0);

  const buildVisibilityScope = (): InlineCommentVisibilityScope => ({
    currentUserId: inlineCommentUserId,
    isPrivileged: isInlineCommentVisibilityPrivileged,
    collaboratorVisibility,
  });

  const cancelBindingRetry = () => {
    if (bindingRetryTimerRef.current !== null) {
      window.clearTimeout(bindingRetryTimerRef.current);
      bindingRetryTimerRef.current = null;
    }
    bindingRetryCountRef.current = 0;
  };

  const runSync = () => {
    if (!inlineCommentEnabled) {
      return;
    }
    const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
    const contentAnchorStores = getContentInlineCommentAnchorStores(doc, registry);
    const needsBinding =
      selectionsYMap.size > 0 || contentAnchorStores.some((store) => store.size > 0);
    if (needsBinding && !hasInlineCommentDocumentYjsBinding(editor)) {
      if (bindingRetryCountRef.current >= BINDING_RETRY_LIMIT) {
        return;
      }
      bindingRetryCountRef.current += 1;
      bindingRetryTimerRef.current = window.setTimeout(() => {
        bindingRetryTimerRef.current = null;
        scheduleDocumentMarksSync();
      }, BINDING_RETRY_DELAY_MS);
      return;
    }

    cancelBindingRetry();
    const visibilityScope = buildVisibilityScope();
    syncPlainTextInlineCommentDocumentMarks(
      editor,
      registry,
      doc,
      getContentInlineCommentThreadIds(doc, registry),
      visibilityScope
    );
    onAfterDocumentMarksSync?.();
  };

  const scheduleDocumentMarksSync = () => {
    if (firstSyncFrameRef.current !== null || secondSyncFrameRef.current !== null) {
      return;
    }

    // Yjs -> ProseMirror binding 可能比 provider sync 晚一帧，延后恢复批注 mark。
    firstSyncFrameRef.current = requestAnimationFrame(() => {
      firstSyncFrameRef.current = null;
      secondSyncFrameRef.current = requestAnimationFrame(() => {
        secondSyncFrameRef.current = null;
        runSync();
      });
    });
  };

  const cancelScheduledDocumentMarksSync = () => {
    if (firstSyncFrameRef.current !== null) {
      cancelAnimationFrame(firstSyncFrameRef.current);
      firstSyncFrameRef.current = null;
    }
    if (secondSyncFrameRef.current !== null) {
      cancelAnimationFrame(secondSyncFrameRef.current);
      secondSyncFrameRef.current = null;
    }
    cancelBindingRetry();
  };

  const detachDocumentMarksSync = () => {
    detachRef.current?.();
    detachRef.current = null;
    hasSyncedRef.current = false;
    cancelScheduledDocumentMarksSync();
  };

  const attachDocumentMarksSync = () => {
    detachDocumentMarksSync();

    if (!inlineCommentEnabled) {
      return;
    }

    const threadsYMap = getBlockNoteThreadsYMap(doc);
    const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
    const contentAnchorStores = getContentInlineCommentAnchorStores(doc, registry);

    const handleSync = (isSynced: boolean) => {
      if (!isSynced) {
        return;
      }
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    };
    const handleInlineCommentSidecarChange = () => {
      if (!hasSyncedRef.current) {
        return;
      }
      scheduleDocumentMarksSync();
    };
    // CommentMark 不在 Yjs CRDT 内，正文协同/本地编辑会冲掉 mark，需按 sidecar 重挂
    const handleEditorChange = () => {
      if (!hasSyncedRef.current || isContentInlineCommentSyncing(doc)) {
        return;
      }
      scheduleDocumentMarksSync();
    };

    provider.on('sync', handleSync);
    threadsYMap.observeDeep(handleInlineCommentSidecarChange);
    selectionsYMap.observe(handleInlineCommentSidecarChange);
    contentAnchorStores.forEach((store) => store.observe(handleInlineCommentSidecarChange));
    const stopEditorChange = editor.onChange(handleEditorChange);

    if (provider.synced) {
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    }

    detachRef.current = () => {
      provider.off('sync', handleSync);
      threadsYMap.unobserveDeep(handleInlineCommentSidecarChange);
      selectionsYMap.unobserve(handleInlineCommentSidecarChange);
      contentAnchorStores.forEach((store) => store.unobserve(handleInlineCommentSidecarChange));
      stopEditorChange();
    };
  };

  useMount(() => {
    attachDocumentMarksSync();
    return detachDocumentMarksSync;
  });

  useUpdateEffect(() => {
    attachDocumentMarksSync();
    return detachDocumentMarksSync;
  }, [
    inlineCommentEnabled,
    collaboratorVisibility,
    inlineCommentUserId,
    doc,
    editor,
    isInlineCommentVisibilityPrivileged,
    provider,
    registry,
  ]);

  useUpdateEffect(() => {
    if (!inlineCommentEnabled || !hasSyncedRef.current) {
      return;
    }
    scheduleDocumentMarksSync();
  }, [collaboratorVisibility, inlineCommentUserId, isInlineCommentVisibilityPrivileged]);
}
