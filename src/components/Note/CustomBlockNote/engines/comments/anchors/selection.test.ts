import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../../../noteEditorComposition';
import {
  isCommentableSelection,
  isDocumentThreadRangeAllowed,
  shouldHideNoteFormattingToolbar,
} from './selection';

function editorWithPmTypes(types: string[]) {
  const nodesBetween = (_from: number, _to: number, visitor: (node: unknown) => boolean) => {
    for (const type of types) {
      if (visitor({ type: { name: type } }) === false) break;
    }
  };
  return {
    prosemirrorView: {
      state: {
        doc: { nodesBetween },
        selection: {
          from: 1,
          to: 2,
          empty: false,
          $from: { nodeAfter: null, nodeBefore: null },
        },
      },
    },
    getSelection: () => ({ blocks: [{ type: 'paragraph' }] }),
    getTextCursorPosition: () => ({ block: { type: 'paragraph' } }),
  };
}

describe('Note comments owner policy', () => {
  it('正文范围允许 text，拒绝 dedicated inline', () => {
    expect(
      isDocumentThreadRangeAllowed(editorWithPmTypes(['text']) as never, notePluginRegistry, 1, 2)
    ).toBe(true);
    expect(
      isDocumentThreadRangeAllowed(
        editorWithPmTypes(['inlineMath']) as never,
        notePluginRegistry,
        1,
        2
      )
    ).toBe(false);
  });

  it('block owner 决定正文批注入口是否可用', () => {
    const editor = editorWithPmTypes(['math']) as ReturnType<typeof editorWithPmTypes> & {
      getSelection: () => { blocks: Array<{ type: string }> };
    };
    editor.getSelection = () => ({ blocks: [{ type: 'math' }] });

    expect(isCommentableSelection(editor as never, notePluginRegistry)).toBe(false);
  });

  it('dedicated 内容 owner 隐藏正文 formatting toolbar', () => {
    const editor = editorWithPmTypes([]);
    editor.prosemirrorView.state.selection.$from.nodeAfter = {
      type: { name: 'inlineMath' },
    } as never;

    expect(shouldHideNoteFormattingToolbar(editor as never, notePluginRegistry)).toBe(true);
  });

  it('dedicated inline 的空文本选区不进入正文批注', () => {
    const editor = editorWithPmTypes([]);
    editor.prosemirrorView.state.selection.empty = true;
    editor.prosemirrorView.state.selection.$from.nodeAfter = {
      type: { name: 'inlineMath' },
    } as never;

    expect(isCommentableSelection(editor as never, notePluginRegistry)).toBe(false);
  });
});
