import { useMemo, useRef } from 'react';
import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { useMount, useUnmount } from 'ahooks';
import * as Y from 'yjs';

/** 笔记正文在 Y.Doc 中的 XmlFragment 名；需与后端 observeDeep 及 BlockNote 绑定名一致 */
export const NOTE_YJS_DOCUMENT_FRAGMENT = 'document-store' as const;

type PluginStateWithBinding = { binding?: unknown };
type ProsemirrorPluginLike = {
  key?: string;
  spec?: { key?: unknown };
  getState: (state: unknown) => unknown;
};

function resolveYjsTrackedOrigins<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {
  const { prosemirrorState } = editor;
  const trackedOrigins = new Set<unknown>();

  for (const plugin of prosemirrorState.plugins as readonly ProsemirrorPluginLike[]) {
    const pluginState = plugin.getState(prosemirrorState) as PluginStateWithBinding | undefined;
    if (pluginState?.binding) {
      trackedOrigins.add(pluginState.binding);
    }

    if (plugin.key?.startsWith('y-sync') && plugin.spec?.key) {
      trackedOrigins.add(plugin.spec.key);
    }
  }

  return trackedOrigins;
}

// 得到笔记正文在 Y.Doc 中的 XmlFragment 名，并创建 UndoManager
export function useNoteYjsUndoManager(doc: Y.Doc): {
  noteFragment: Y.XmlFragment;
  undoManager: Y.UndoManager;
} {
  const noteFragment = useMemo(() => doc.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT), [doc]);
  const undoManager = useMemo(
    () =>
      new Y.UndoManager(noteFragment, {
        trackedOrigins: new Set<unknown>([null]),
        captureTimeout: 500,
      }),
    [noteFragment]
  );

  return { noteFragment, undoManager };
}

/**
 * 将协同相关的 Yjs origin 纳入 UndoManager，并在运行期持续补充本地事务的 origin。
 * 需在 `useCreateBlockNote` 拿到 `editor` 之后调用。
 */
export function useAttachNoteYjsUndoStack<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(doc: Y.Doc, editor: BlockNoteEditor<BSchema, ISchema, SSchema>, undoManager: Y.UndoManager) {
  const afterTransactionListenerRef = useRef<((transaction: Y.Transaction) => void) | null>(null);

  useMount(() => {
    const trackedOrigins = resolveYjsTrackedOrigins(editor);
    for (const origin of trackedOrigins) {
      undoManager.trackedOrigins.add(origin);
    }

    const handleAfterTransaction = (transaction: Y.Transaction) => {
      if (!transaction.local) return;
      if (transaction.origin != null) {
        undoManager.trackedOrigins.add(transaction.origin);
      }
    };
    afterTransactionListenerRef.current = handleAfterTransaction;
    doc.on('afterTransaction', handleAfterTransaction);
  });

  useUnmount(() => {
    if (afterTransactionListenerRef.current) {
      doc.off('afterTransaction', afterTransactionListenerRef.current);
      afterTransactionListenerRef.current = null;
    }
    undoManager.destroy();
  });
}
