import { useMount, useUpdateEffect } from 'ahooks';
import { useRef } from 'react';
import type { Doc } from 'yjs';

import type { WisepenProvider } from '@/domains/Note';
import type { NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { getBlockNoteThreadsYMap } from '../threads/yjs';
import type { CollaboratorCommentVisibility } from '../visibility/document';
import type { ThreadVisibilityScope } from '../visibility/filter';
import {
  getContentCommentAnchorStores,
  getContentCommentThreadIds,
  isContentCommentSyncing,
} from './content';
import {
  getBlockNoteThreadDocumentSelectionsYMap,
  hasCommentDocumentYjsBinding,
  syncPlainTextCommentDocumentMarks,
} from './range';

type UseSyncCommentDocumentMarksOptions = {
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  doc: Doc;
  provider: WisepenProvider;
  commentsEnabled: boolean;
  commentUserId?: string;
  isCommentVisibilityPrivileged?: boolean;
  collaboratorVisibility?: CollaboratorCommentVisibility;
  onAfterDocumentMarksSync?: () => void;
};

const BINDING_RETRY_DELAY_MS = 50;
const BINDING_RETRY_LIMIT = 20;

export function useSyncCommentDocumentMarks({
  editor,
  registry,
  doc,
  provider,
  commentsEnabled,
  commentUserId = '',
  isCommentVisibilityPrivileged = false,
  collaboratorVisibility = 'all',
  onAfterDocumentMarksSync,
}: UseSyncCommentDocumentMarksOptions) {
  const hasSyncedRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);
  const firstSyncFrameRef = useRef<number | null>(null);
  const secondSyncFrameRef = useRef<number | null>(null);
  const bindingRetryTimerRef = useRef<number | null>(null);
  const bindingRetryCountRef = useRef(0);

  const buildVisibilityScope = (): ThreadVisibilityScope => ({
    currentUserId: commentUserId,
    isPrivileged: isCommentVisibilityPrivileged,
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
    if (!commentsEnabled) {
      return;
    }
    const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
    const contentAnchorStores = getContentCommentAnchorStores(doc, registry);
    const needsBinding =
      selectionsYMap.size > 0 || contentAnchorStores.some((store) => store.size > 0);
    if (needsBinding && !hasCommentDocumentYjsBinding(editor)) {
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
    syncPlainTextCommentDocumentMarks(
      editor,
      registry,
      doc,
      getContentCommentThreadIds(doc, registry),
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

    if (!commentsEnabled) {
      return;
    }

    const threadsYMap = getBlockNoteThreadsYMap(doc);
    const selectionsYMap = getBlockNoteThreadDocumentSelectionsYMap(doc);
    const contentAnchorStores = getContentCommentAnchorStores(doc, registry);

    const handleSync = (isSynced: boolean) => {
      if (!isSynced) {
        return;
      }
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    };
    const handleCommentSidecarChange = () => {
      if (!hasSyncedRef.current) {
        return;
      }
      scheduleDocumentMarksSync();
    };
    // CommentMark 不在 Yjs CRDT 内，正文协同/本地编辑会冲掉 mark，需按 sidecar 重挂
    const handleEditorChange = () => {
      if (!hasSyncedRef.current || isContentCommentSyncing(doc)) {
        return;
      }
      scheduleDocumentMarksSync();
    };

    provider.on('sync', handleSync);
    threadsYMap.observeDeep(handleCommentSidecarChange);
    selectionsYMap.observe(handleCommentSidecarChange);
    contentAnchorStores.forEach((store) => store.observe(handleCommentSidecarChange));
    const stopEditorChange = editor.onChange(handleEditorChange);

    if (provider.synced) {
      hasSyncedRef.current = true;
      scheduleDocumentMarksSync();
    }

    detachRef.current = () => {
      provider.off('sync', handleSync);
      threadsYMap.unobserveDeep(handleCommentSidecarChange);
      selectionsYMap.unobserve(handleCommentSidecarChange);
      contentAnchorStores.forEach((store) => store.unobserve(handleCommentSidecarChange));
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
    commentsEnabled,
    collaboratorVisibility,
    commentUserId,
    doc,
    editor,
    isCommentVisibilityPrivileged,
    provider,
    registry,
  ]);

  useUpdateEffect(() => {
    if (!commentsEnabled || !hasSyncedRef.current) {
      return;
    }
    scheduleDocumentMarksSync();
  }, [collaboratorVisibility, commentUserId, isCommentVisibilityPrivileged]);
}
