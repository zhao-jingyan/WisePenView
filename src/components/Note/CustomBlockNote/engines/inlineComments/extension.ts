import { createExtension, type ExtensionFactoryInstance } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ySyncPluginKey, type ProsemirrorBinding } from 'y-prosemirror';
import type { XmlFragment } from 'yjs';

import type { NoteInlineCommentSession } from '@/domains/Note';
import { resolveInlineCommentAnchor } from './relativePosition';
import styles from './style.module.less';

interface InlineCommentExtensionState {
  ranges: readonly InlineCommentAnchorRange[];
  decorations: DecorationSet;
}

interface InlineCommentAnchorRange {
  threadId: string;
  from: number;
  to: number;
  fromAssoc: -1 | 1;
  toAssoc: -1 | 1;
}

const inlineCommentPluginKey = new PluginKey<InlineCommentExtensionState>('noteInlineComments');
const inlineCommentDecorationSpec = { inclusiveStart: false, inclusiveEnd: false };

export function findInlineCommentAnchorElement(
  root: ParentNode,
  threadId: string
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[data-inline-comment-thread-id="${CSS.escape(threadId)}"]`
  );
}

function readBinding(state: EditorState): ProsemirrorBinding | null {
  const syncState = ySyncPluginKey.getState(state) as { binding?: ProsemirrorBinding } | undefined;
  return syncState?.binding ?? null;
}

function buildDecorations(params: {
  doc: PMNode;
  ranges: readonly InlineCommentAnchorRange[];
}): DecorationSet {
  const { doc, ranges } = params;
  const decorations = ranges.flatMap((range) => {
    const from = Math.max(0, Math.min(range.from, doc.content.size));
    const to = Math.max(from, Math.min(range.to, doc.content.size));
    if (from === to) return [];
    const attrs = {
      class: styles.anchor,
      'data-inline-comment-thread-id': range.threadId,
    };
    const threadDecorations: Decoration[] = [];
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const textFrom = Math.max(from, pos);
        const textTo = Math.min(to, pos + node.nodeSize);
        if (textFrom < textTo) {
          threadDecorations.push(
            Decoration.inline(textFrom, textTo, attrs, inlineCommentDecorationSpec)
          );
        }
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

function resolveAnchorRanges(params: {
  fragment: XmlFragment;
  binding: ProsemirrorBinding;
  session: NoteInlineCommentSession;
}): InlineCommentAnchorRange[] {
  const { fragment, binding, session } = params;
  return session.getSnapshot().threads.flatMap((thread) => {
    const range = resolveInlineCommentAnchor({ anchor: thread.anchor, fragment, binding });
    return range ? [{ threadId: thread.threadId, ...range }] : [];
  });
}

function mapAnchorRanges(
  ranges: readonly InlineCommentAnchorRange[],
  tr: Transaction
): InlineCommentAnchorRange[] {
  return ranges.flatMap((range) => {
    const from = tr.mapping.map(range.from, range.fromAssoc);
    const to = tr.mapping.map(range.to, range.toAssoc);
    return from < to ? [{ ...range, from, to }] : [];
  });
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
          init: () => ({ ranges: [], decorations: DecorationSet.empty }),
          apply: (tr, previous, _oldState, newState) => {
            const refresh = tr.getMeta(inlineCommentPluginKey) === true;
            if (!tr.docChanged && !refresh) return previous;
            const binding = fragment.doc ? readBinding(newState) : null;
            const ranges = refresh
              ? binding
                ? resolveAnchorRanges({ fragment, binding, session })
                : previous.ranges
              : mapAnchorRanges(previous.ranges, tr);
            return {
              ranges,
              decorations: buildDecorations({ doc: newState.doc as unknown as PMNode, ranges }),
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
            const binding = readBinding(view.state);
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
            // 文本编辑不会改变批注锚点的相对顺序，仅在批注列表变更时同步侧栏排序。
            scheduleThreadOrderSynchronization();
            refresh();
          });
          scheduleThreadOrderSynchronization();
          refresh();
          return {
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
