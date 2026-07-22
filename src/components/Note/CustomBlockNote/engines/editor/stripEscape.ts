import { createExtension } from '@blocknote/core';
import type { Mark } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorProps } from '@tiptap/pm/view';

import type { NoteEditorExtension } from '../../registry/types';
import { summarizeNoteTransactions } from './transactionSummary';

const ESC = '\u001b';

function textContainsEsc(text: string): boolean {
  for (const ch of text) {
    if (ch.codePointAt(0) === 0x1b) return true;
  }
  return false;
}

/**
 * 部分环境下 Esc 会以 insertText 写入 U+001B；拦截后不影响 BlockNote 用 Esc 关菜单/失焦（走 keydown）
 * 在编辑器视图上拦截含 U+001B 的 insertText / insertCompositionText（PM 会对返回 true 的事件 preventDefault）。
 * appendTransaction 负责协同等不经过 DOM 输入的路径。
 */
const stripEscapeEditorProps: Pick<EditorProps, 'handleDOMEvents'> = {
  handleDOMEvents: {
    beforeinput(_view, event) {
      const e = event as InputEvent;
      if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') {
        return false;
      }
      const data = e.data;
      if (data == null || data === '') return false;
      if (!textContainsEsc(data)) return false;
      e.preventDefault();
      return true;
    },
  },
};

/** 文档层兜底：剔除已写入的 U+001B（协同 / 非 DOM 输入等）。 */
const stripEscapeCharExtension = createExtension({
  key: 'stripEscapeChar',
  prosemirrorPlugins: [
    new Plugin({
      key: new PluginKey('stripEscapeChar'),
      appendTransaction(transactions, _oldState, newState) {
        const summary = summarizeNoteTransactions(transactions);
        if (!summary.docChanged || !summary.hasEscape) {
          return null;
        }

        const fixes: Array<{
          from: number;
          to: number;
          cleaned: string;
          marks: readonly Mark[];
        }> = [];

        const textNodes = new Map<
          number,
          { text: string; marks: readonly Mark[]; nodeSize: number }
        >();
        summary.ranges.forEach((range) => {
          const from = Math.max(0, Math.min(range.from, newState.doc.content.size));
          const to = Math.max(from, Math.min(range.to, newState.doc.content.size));
          newState.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText && node.text?.includes(ESC)) {
              textNodes.set(pos, {
                text: node.text,
                marks: [...node.marks],
                nodeSize: node.nodeSize,
              });
            }
            return true;
          });
        });
        textNodes.forEach((node, from) => {
          fixes.push({
            from,
            to: from + node.nodeSize,
            cleaned: node.text.replaceAll(ESC, ''),
            marks: node.marks,
          });
        });

        if (fixes.length === 0) {
          return null;
        }

        fixes.sort((a, b) => b.from - a.from);

        let tr = newState.tr;
        for (const f of fixes) {
          if (f.cleaned.length === 0) {
            tr = tr.delete(f.from, f.to);
          } else {
            tr = tr.replaceWith(f.from, f.to, newState.schema.text(f.cleaned, f.marks));
          }
        }
        return tr;
      },
    }),
  ],
});

export const stripEscapeEditorExtension = {
  id: 'editor.strip-escape',
  extensions: () => [stripEscapeCharExtension],
  editorProps: () => stripEscapeEditorProps,
} satisfies NoteEditorExtension;
