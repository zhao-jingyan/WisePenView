import { useEffectForce } from '@/hooks/useEffectForce';
import { useLatest, useMemoizedFn } from 'ahooks';
import { useRef } from 'react';

import {
  buildNoteOutlineProjection,
  resolveActiveOutlineItemId,
  type NoteOutlineBlockSnapshot,
  type NoteOutlineItem,
} from '../engines/outline';
import type { CustomBlockNoteEditor } from '../noteEditorComposition';
import type { NotePluginRegistry } from '../registry/types';

interface UseNoteOutlineRuntimeParams {
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveItemChange?: (activeId: string | undefined) => void;
}

export function useNoteOutlineRuntime({
  editor,
  registry,
  onOutlineChange,
  onActiveItemChange,
}: UseNoteOutlineRuntimeParams) {
  const callbacksLatest = useLatest({ onOutlineChange, onActiveItemChange });
  const blockSnapshotsRef = useRef<NoteOutlineBlockSnapshot[]>([]);

  const refresh = useMemoizedFn(() => {
    const callbacks = callbacksLatest.current;
    if (!callbacks.onOutlineChange && !callbacks.onActiveItemChange) return;
    const projection = buildNoteOutlineProjection(editor, registry);
    blockSnapshotsRef.current = projection.blocks;
    callbacks.onOutlineChange?.(projection.items);
  });

  /**
   * Editor 是 Outline 的外部事件源；实例变化时重新订阅，cleanup 释放旧实例监听。
   * 目录依赖整篇文档，无法由单次用户事件或 React 派生状态替代该订阅。
   */
  useEffectForce(() => {
    const cleanup = editor.onChange(refresh);
    refresh();
    return cleanup;
  }, [editor, refresh]);

  const syncActiveItem = useMemoizedFn(() => {
    const onChange = callbacksLatest.current.onActiveItemChange;
    if (!onChange) return;
    try {
      const currentBlockId = editor.getTextCursorPosition().block?.id;
      onChange(
        currentBlockId
          ? resolveActiveOutlineItemId(blockSnapshotsRef.current, currentBlockId)
          : undefined
      );
    } catch {
      onChange(undefined);
    }
  });

  return { syncActiveItem };
}
