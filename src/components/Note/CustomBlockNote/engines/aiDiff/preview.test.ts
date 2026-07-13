import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { NOTE_AI_DIFF_PREVIEW_MOCK } from '@/domains/Note/mock/aiDiffPreview.mockdata';
import { blockNoteSchema, notePluginRegistry } from '../../noteEditorComposition';
import { initializeAiDiffPreview } from './preview';
import { readAllAiContent } from './store';

function createEditor() {
  return BlockNoteEditor.create({ schema: blockNoteSchema });
}

describe('AI Diff Mock 预览初始化', () => {
  it('写入可由真实 owner 解析的正文与 sidecar 数据', () => {
    const editor = createEditor();
    const doc = new Y.Doc();

    expect(initializeAiDiffPreview({ doc, editor, preview: NOTE_AI_DIFF_PREVIEW_MOCK })).toBe(true);

    const payloads = readAllAiContent(doc);
    expect(payloads.size).toBe(NOTE_AI_DIFF_PREVIEW_MOCK.items.length);
    NOTE_AI_DIFF_PREVIEW_MOCK.items.forEach((item) => {
      const block = editor.getBlock(item.block.id);
      const payload = payloads.get(item.block.id);
      expect(block).toBeDefined();
      expect(payload).toBeDefined();
      expect(
        block && payload
          ? notePluginRegistry.blockPlugins
              .get(block.type)
              ?.aiDiff?.resolve(block, payload, notePluginRegistry)
          : null
      ).not.toBeNull();
    });

    const staleProjection = notePluginRegistry.blockPlugins
      .get('checkListItem')
      ?.aiDiff?.resolve(
        editor.getBlock('mock-ai-diff-stale')!,
        payloads.get('mock-ai-diff-stale')!,
        notePluginRegistry
      );
    expect(staleProjection?.stale).toBe(true);
    doc.destroy();
  });

  it('同一场景不重复覆盖已操作的预览内容', () => {
    const editor = createEditor();
    const doc = new Y.Doc();
    initializeAiDiffPreview({ doc, editor, preview: NOTE_AI_DIFF_PREVIEW_MOCK });
    doc.getMap('ai-content-store').delete('mock-ai-diff-paragraph');

    expect(initializeAiDiffPreview({ doc, editor, preview: NOTE_AI_DIFF_PREVIEW_MOCK })).toBe(
      false
    );
    expect(readAllAiContent(doc).has('mock-ai-diff-paragraph')).toBe(false);
    doc.destroy();
  });
});
