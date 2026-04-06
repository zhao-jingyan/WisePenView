import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

import type { NoteInstance } from '@/session/plugins/note/NoteInstance';

/**
 * 捕获阶段仅上报 sendIntent，不 preventDefault / 不手动 editor.undo。
 * 协作模式下撤销由 BlockNote 内置键位处理；这里只做异步意图埋点。
 */
export function useNoteCaptureKeyEvent(instance: NoteInstance) {
  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const emitIntentDeferred = (
        operationType: Parameters<NoteInstance['sendIntent']>[0],
        source: string
      ) => {
        window.setTimeout(() => {
          instance.sendIntent(operationType, source);
        }, 0);
      };

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw;

      if (k === 'c') {
        emitIntentDeferred('COPY', e.metaKey ? 'Cmd+C' : 'Ctrl+C');
        return;
      }

      if (k === 'v') {
        emitIntentDeferred('PASTE', e.metaKey ? 'Cmd+V' : 'Ctrl+V');
        return;
      }

      if (k === 'z') {
        if (e.shiftKey) {
          emitIntentDeferred('REDO', e.metaKey ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z');
        } else {
          emitIntentDeferred('UNDO', e.metaKey ? 'Cmd+Z' : 'Ctrl+Z');
        }
        return;
      }

      if (k === 'y' && e.ctrlKey && !e.metaKey) {
        emitIntentDeferred('REDO', 'Ctrl+Y');
      }
    },
    [instance]
  );
}
