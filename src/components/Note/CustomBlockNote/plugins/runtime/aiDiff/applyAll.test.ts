import { describe, expect, it, vi } from 'vitest';

import { notePluginRegistry } from '../..';
import { applyAllNoteAiDiffActions } from './applyAll';

describe('applyAllNoteAiDiffActions', () => {
  it('删除无子块的空结果，保留并更新带子块的父块', () => {
    const removable = {
      id: 'removable',
      type: 'paragraph',
      props: {},
      content: [{ type: 'ai-add', props: { text: '新增', key: 'remove-change' } }],
      children: [],
    };
    const parent = {
      id: 'parent',
      type: 'paragraph',
      props: {},
      content: [{ type: 'ai-add', props: { text: '新增', key: 'parent-change' } }],
      children: [{ id: 'child', type: 'paragraph', props: {}, content: [], children: [] }],
    };
    const updateBlock = vi.fn();
    const removeBlocks = vi.fn();
    const focus = vi.fn();
    const editor = {
      forEachBlock(visitor: (block: typeof removable | typeof parent) => boolean) {
        visitor(removable);
        visitor(parent);
      },
      updateBlock,
      removeBlocks,
      focus,
    };

    applyAllNoteAiDiffActions(editor as never, notePluginRegistry, 'discard');

    expect(updateBlock).toHaveBeenCalledWith(parent, { content: [] });
    expect(removeBlocks).toHaveBeenCalledWith([removable]);
    expect(focus).toHaveBeenCalledOnce();
  });
});
