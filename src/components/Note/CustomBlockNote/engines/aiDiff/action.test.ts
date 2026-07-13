import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

import type { NoteAiContentPayload } from '../../content/types';
import { notePluginRegistry } from '../../noteEditorComposition';
import { applyNoteAiDiffAction } from './action';
import { hashNoteBlockForAiDiff } from './projection';
import { getAiContentStore, readBlockAiContent } from './store';

function setBlockAiContent(doc: Y.Doc, blockId: string, payload: NoteAiContentPayload): void {
  getAiContentStore(doc).set(blockId, payload);
}

function createEditor() {
  const block = {
    id: 'block-1',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: '旧', styles: {} }],
    children: [],
  };
  const document = [block];
  return {
    block,
    editor: {
      document,
      updateBlock: vi.fn((_block: unknown, update: Record<string, unknown>) => {
        Object.assign(block, update);
      }),
      removeBlocks: vi.fn(() => {
        document.splice(0, document.length);
      }),
    },
  };
}

function updatePayload(block: Record<string, unknown>): NoteAiContentPayload {
  return {
    revision: 'r1',
    baseHash: hashNoteBlockForAiDiff(block),
    operation: 'update',
    candidate: {
      props: {},
      content: [{ type: 'text', text: '新', styles: {} }],
    },
  };
}

describe('AI Diff action', () => {
  it('接受时更新 native block，成功后清理 sidecar', () => {
    const doc = new Y.Doc();
    const { block, editor } = createEditor();
    setBlockAiContent(doc, block.id, updatePayload(block));

    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r1',
        action: 'accept',
      })
    ).toBe('applied');
    expect(editor.updateBlock).toHaveBeenCalledWith(block, {
      props: {},
      content: [{ type: 'text', text: '新', styles: {} }],
    });
    expect(readBlockAiContent(doc, block.id)).toBeNull();
  });

  it('拒绝 update 时正文不变，只清理 sidecar', () => {
    const doc = new Y.Doc();
    const { block, editor } = createEditor();
    setBlockAiContent(doc, block.id, updatePayload(block));

    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r1',
        action: 'discard',
      })
    ).toBe('applied');
    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(editor.removeBlocks).not.toHaveBeenCalled();
  });

  it('正文 stale 时禁止接受并保留 sidecar', () => {
    const doc = new Y.Doc();
    const { block, editor } = createEditor();
    setBlockAiContent(doc, block.id, { ...updatePayload(block), baseHash: 'outdated' });

    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r1',
        action: 'accept',
      })
    ).toBe('stale');
    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(readBlockAiContent(doc, block.id)).not.toBeNull();
  });

  it('正文事务被拦截时不清理 sidecar', () => {
    const doc = new Y.Doc();
    const { block, editor } = createEditor();
    editor.updateBlock = vi.fn();
    setBlockAiContent(doc, block.id, updatePayload(block));

    expect(() =>
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r1',
        action: 'accept',
      })
    ).toThrow('AI Diff block 更新未生效');
    expect(readBlockAiContent(doc, block.id)).not.toBeNull();
  });

  it('按展示 hunk 接受后重锚定 sidecar，并继续接受剩余修改', () => {
    const doc = new Y.Doc();
    const { block, editor } = createEditor();
    block.content = [{ type: 'text', text: '团队将在月底完成首次复盘。', styles: {} }];
    const baseHash = hashNoteBlockForAiDiff(block);
    setBlockAiContent(doc, block.id, {
      revision: 'r-granular',
      baseHash,
      operation: 'update',
      candidate: {
        props: {},
        content: [{ type: 'text', text: '团队仍将在月底完成最终复盘。', styles: {} }],
      },
    });

    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r-granular',
        baseHash,
        action: 'accept',
        target: { kind: 'text-hunk', index: 0 },
      })
    ).toBe('applied');
    expect(block.content).toEqual([
      { type: 'text', text: '团队仍将在月底完成首次复盘。', styles: {} },
    ]);

    const remaining = readBlockAiContent(doc, block.id);
    expect(remaining?.baseHash).toBe(hashNoteBlockForAiDiff(block));
    expect(remaining?.baseHash).not.toBe(baseHash);
    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r-granular',
        baseHash,
        action: 'accept',
        target: { kind: 'text-hunk', index: 0 },
      })
    ).toBe('stale');

    expect(
      applyNoteAiDiffAction({
        doc,
        editor: editor as never,
        registry: notePluginRegistry,
        blockId: block.id,
        revision: 'r-granular',
        baseHash: remaining?.baseHash,
        action: 'accept',
        target: { kind: 'text-hunk', index: 0 },
      })
    ).toBe('applied');
    expect(block.content).toEqual([
      { type: 'text', text: '团队仍将在月底完成最终复盘。', styles: {} },
    ]);
    expect(readBlockAiContent(doc, block.id)).toBeNull();
  });

  it('由 block owner 决定 create 拒绝与 delete 接受都删除 native block', () => {
    for (const [operation, action, candidate] of [
      ['create', 'discard', { props: {}, content: [{ type: 'text', text: '新增', styles: {} }] }],
      ['delete', 'accept', null],
    ] as const) {
      const doc = new Y.Doc();
      const { block, editor } = createEditor();
      const child = {
        id: 'child-1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: '子块', styles: {} }],
        children: [],
      };
      (block.children as unknown[]).push(child);
      setBlockAiContent(doc, child.id, updatePayload(child));
      setBlockAiContent(doc, block.id, {
        revision: `r-${operation}`,
        baseHash: hashNoteBlockForAiDiff(block),
        operation,
        candidate,
      });

      expect(
        applyNoteAiDiffAction({
          doc,
          editor: editor as never,
          registry: notePluginRegistry,
          blockId: block.id,
          revision: `r-${operation}`,
          action,
        })
      ).toBe('applied');
      expect(editor.removeBlocks).toHaveBeenCalledWith([block]);
      expect(readBlockAiContent(doc, block.id)).toBeNull();
      expect(readBlockAiContent(doc, child.id)).toBeNull();
    }
  });
});
