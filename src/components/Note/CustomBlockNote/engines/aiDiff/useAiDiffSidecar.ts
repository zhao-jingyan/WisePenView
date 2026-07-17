import { useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import type * as Y from 'yjs';

import type { AiDiffDisplayMode } from '@/domains/Note';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';
import type { NotePluginRegistry } from '../../registry/types';
import { applyNoteAiDiffAction } from './action';
import { resolveNoteAiDiffBlock } from './contentState';
import type { NoteAiDiffActionRequest } from './extension';
import { syncAiDiffExtensionState } from './extension';
import { observeAiContent, readAllAiContent } from './store';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findBlockById(blocks: readonly unknown[], id: string): Record<string, unknown> | null {
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.id === id) return block;
    if (Array.isArray(block.children)) {
      const nested = findBlockById(block.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

function hasActiveAiDiff(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  aiContentByBlockId: ReturnType<typeof readAllAiContent>
): boolean {
  for (const [blockId, aiContent] of aiContentByBlockId) {
    const block = findBlockById(editor.document, blockId);
    if (!block || typeof block.type !== 'string') continue;
    const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
    if (aiDiff && resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry)) {
      return true;
    }
  }
  return false;
}

export function useAiDiffSidecar(params: {
  doc: Y.Doc;
  noteFragment: Y.XmlFragment;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  displayMode: AiDiffDisplayMode;
  readOnly: boolean;
  undoManager: Y.UndoManager;
  onPresenceChange?: (present: boolean) => void;
}): boolean {
  const {
    doc,
    noteFragment,
    editor,
    registry,
    displayMode,
    readOnly,
    undoManager,
    onPresenceChange,
  } = params;
  const [present, setPresent] = useState(false);
  const lastPresenceRef = useRef(false);
  const queuedFrameRef = useRef<number | null>(null);

  const applyAction = useMemoizedFn((request: NoteAiDiffActionRequest) => {
    undoManager.stopCapturing();
    applyNoteAiDiffAction({ doc, editor, registry, ...request });
    editor.focus();
    undoManager.stopCapturing();
  });

  const sync = useMemoizedFn(() => {
    const aiContentByBlockId = readAllAiContent(doc);
    syncAiDiffExtensionState(editor.prosemirrorView, {
      displayMode,
      aiContentByBlockId,
      actionsEnabled: !readOnly,
      onAction: applyAction,
    });
    const nextPresence = hasActiveAiDiff(editor, registry, aiContentByBlockId);
    if (lastPresenceRef.current === nextPresence) return;
    lastPresenceRef.current = nextPresence;
    setPresent(nextPresence);
    onPresenceChange?.(nextPresence);
  });

  /**
   * 执行时机：sidecar 或正文变化时，刷新本地只读投影与 presence。
   * 不可替代原因：sidecar 是独立 Y.Map，不会触发 BlockNote 的 onChange。
   * cleanup：移除 Yjs 监听并取消待执行帧，避免旧文档继续刷新编辑器。
   */
  useEffectForce(() => {
    const scheduleSync = () => {
      if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);
      queuedFrameRef.current = window.requestAnimationFrame(() => {
        queuedFrameRef.current = null;
        sync();
      });
    };
    const unobserveAiContent = observeAiContent(doc, scheduleSync);
    noteFragment.observeDeep(scheduleSync);
    scheduleSync();
    return () => {
      unobserveAiContent();
      noteFragment.unobserveDeep(scheduleSync);
      if (queuedFrameRef.current !== null) {
        window.cancelAnimationFrame(queuedFrameRef.current);
        queuedFrameRef.current = null;
      }
    };
  }, [displayMode, doc, editor, noteFragment, readOnly, registry, sync]);

  return present;
}
