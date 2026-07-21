import { createExtension, type ExtensionFactoryInstance } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { ySyncPluginKey, type ProsemirrorBinding } from 'y-prosemirror';
import type { XmlFragment } from 'yjs';

import type { NoteInlineCommentSession } from '@/domains/Note';
import { resolveInlineCommentAnchor } from './relativePosition';
import styles from './style.module.less';

interface InlineCommentExtensionState {
  decorations: DecorationSet;
}

const inlineCommentPluginKey = new PluginKey<InlineCommentExtensionState>('noteInlineComments');

function readBinding(view: EditorView): ProsemirrorBinding | null {
  const syncState = ySyncPluginKey.getState(view.state) as
    { binding?: ProsemirrorBinding } | undefined;
  return syncState?.binding ?? null;
}

function buildDecorations(params: {
  doc: PMNode;
  view: EditorView;
  fragment: XmlFragment;
  session: NoteInlineCommentSession;
}): DecorationSet {
  const { doc, view, fragment, session } = params;
  const binding = readBinding(view);
  if (!binding) return DecorationSet.empty;
  const decorations = session.getSnapshot().threads.flatMap((thread) => {
    const range = resolveInlineCommentAnchor({ anchor: thread.anchor, fragment, binding });
    if (!range) return [];
    const from = Math.max(0, Math.min(range.from, doc.content.size));
    const to = Math.max(from, Math.min(range.to, doc.content.size));
    if (from === to) return [];
    const attrs = {
      class: styles.anchor,
      'data-inline-comment-thread-id': thread.threadId,
    };
    const threadDecorations: Decoration[] = [];
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const textFrom = Math.max(from, pos);
        const textTo = Math.min(to, pos + node.nodeSize);
        if (textFrom < textTo) threadDecorations.push(Decoration.inline(textFrom, textTo, attrs));
        return;
      }
      if ((node.isInline || node.isLeaf) && node.nodeSize > 0) {
        const nodeFrom = Math.max(from, pos);
        const nodeTo = Math.min(to, pos + node.nodeSize);
        if (nodeFrom < nodeTo)
          threadDecorations.push(Decoration.node(pos, pos + node.nodeSize, attrs));
      }
    });
    return threadDecorations;
  });
  return DecorationSet.create(doc, decorations);
}

function collectThreadAnchorPositions(params: {
  fragment: XmlFragment;
  binding: ProsemirrorBinding;
  session: NoteInlineCommentSession;
}): Map<string, number> {
  const { fragment, binding, session } = params;
  const snapshot = session.getSnapshot();
  const positions = new Map<string, number>();
  [...snapshot.threads, ...snapshot.resolvedThreads].forEach((thread) => {
    const range = resolveInlineCommentAnchor({ anchor: thread.anchor, fragment, binding });
    if (range) positions.set(thread.threadId, range.from);
  });
  return positions;
}

export function createInlineCommentExtension(params: {
  fragment: XmlFragment;
  session: NoteInlineCommentSession;
  onThreadSelect(threadId: string): void;
}): ExtensionFactoryInstance {
  const { fragment, session, onThreadSelect } = params;
  return createExtension(({ editor: _editor }) => ({
    key: 'noteInlineComments',
    prosemirrorPlugins: [
      new Plugin<InlineCommentExtensionState>({
        key: inlineCommentPluginKey,
        state: {
          init: () => ({ decorations: DecorationSet.empty }),
          apply: (tr, previous, _oldState, newState) => {
            const refresh = tr.getMeta(inlineCommentPluginKey) === true;
            if (!tr.docChanged && !refresh) return previous;
            const view = fragment.doc
              ? (ySyncPluginKey.getState(newState) as { binding?: ProsemirrorBinding } | undefined)
                  ?.binding?.prosemirrorView
              : null;
            if (!view) return previous;
            return {
              decorations: buildDecorations({
                doc: newState.doc as unknown as PMNode,
                view,
                fragment,
                session,
              }),
            };
          },
        },
        props: {
          decorations: (state) => inlineCommentPluginKey.getState(state)?.decorations ?? null,
          handleClick: (_view, _pos, event) => {
            const target = event.target;
            if (!(target instanceof Element)) return false;
            const anchor = target.closest<HTMLElement>('[data-inline-comment-thread-id]');
            const threadId = anchor?.dataset.inlineCommentThreadId;
            if (!threadId) return false;
            onThreadSelect(threadId);
            return false;
          },
        },
        view: (view) => {
          let synchronizeFrame: number | undefined;
          const synchronizeThreadOrder = () => {
            synchronizeFrame = undefined;
            const binding = readBinding(view);
            if (!binding) return;
            session.setThreadAnchorPositions(
              collectThreadAnchorPositions({ fragment, binding, session })
            );
          };
          const scheduleThreadOrderSynchronization = () => {
            if (synchronizeFrame !== undefined) return;
            synchronizeFrame = window.requestAnimationFrame(synchronizeThreadOrder);
          };
          const refresh = () => {
            view.dispatch(
              view.state.tr.setMeta(inlineCommentPluginKey, true).setMeta('addToHistory', false)
            );
          };
          const unsubscribe = session.subscribe(() => {
            scheduleThreadOrderSynchronization();
            refresh();
          });
          scheduleThreadOrderSynchronization();
          refresh();
          return {
            update: scheduleThreadOrderSynchronization,
            destroy: () => {
              unsubscribe();
              if (synchronizeFrame !== undefined) {
                window.cancelAnimationFrame(synchronizeFrame);
              }
            },
          };
        },
      }),
    ],
  }))();
}
