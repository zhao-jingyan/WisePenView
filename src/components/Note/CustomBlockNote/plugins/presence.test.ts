import { defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '.';
import { hasAiDiffInBlock } from './presence';
import { createNotePluginRegistry } from './registry';
import type {
  NoteBlockPlugin,
  NoteContentCapabilityDeclarations,
  NoteInlinePlugin,
  NotePluginBundle,
} from './types';

const unsupportedCapabilities: NoteContentCapabilityDeclarations = {
  markdownImport: { support: 'unsupported', reason: '测试内容不支持' },
  markdownExport: { support: 'unsupported', reason: '测试内容不支持' },
  aiDiff: { support: 'unsupported', reason: '测试内容不支持' },
  comments: { support: 'unsupported', reason: '测试内容不支持' },
  projection: { support: 'unsupported', reason: '测试内容不支持' },
  print: { support: 'unsupported', reason: '测试内容不支持' },
};

describe('Note AI Diff presence', () => {
  it('由 inline owner 判断普通文本、AI 语法和行内公式', () => {
    expect(
      hasAiDiffInBlock(
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '正文' },
            { type: 'ai-add', props: { text: '新增', key: 'change-1' } },
          ],
        },
        notePluginRegistry
      )
    ).toBe(true);

    expect(
      hasAiDiffInBlock(
        {
          type: 'paragraph',
          content: [
            {
              type: 'inlineMath',
              props: { expression: 'y', aiDiffType: 'edit', aiDiffOrigin: 'x' },
            },
          ],
        },
        notePluginRegistry
      )
    ).toBe(true);

    expect(
      hasAiDiffInBlock(
        { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
        notePluginRegistry
      )
    ).toBe(false);
  });

  it('递归检查嵌套 block，并由 math block owner 判断原子 props', () => {
    expect(
      hasAiDiffInBlock(
        {
          type: 'paragraph',
          content: [],
          children: [
            {
              type: 'math',
              props: { expression: 'y', aiDiffType: 'create', aiDiffReplace: 'y' },
            },
          ],
        },
        notePluginRegistry
      )
    ).toBe(true);
  });

  it('新增 inline owner 不需要修改中央 presence 遍历', () => {
    const paragraphOwner = {
      kind: 'block',
      id: 'test.block.paragraph',
      type: 'paragraph',
      spec: defaultBlockSpecs.paragraph,
      capabilities: unsupportedCapabilities,
    } satisfies NoteBlockPlugin;
    const customInlineOwner = {
      kind: 'inline',
      id: 'test.inline.change',
      type: 'custom-change',
      spec: defaultInlineContentSpecs.text,
      capabilities: unsupportedCapabilities,
      aiDiff: {
        isPresent: (inline) => inline.changed === true,
      },
      comments: { canCreateDocumentThread: false },
    } satisfies NoteInlinePlugin;
    const root = {
      kind: 'bundle',
      id: 'test',
      children: [paragraphOwner, customInlineOwner],
    } satisfies NotePluginBundle;
    const registry = createNotePluginRegistry(root);

    expect(
      hasAiDiffInBlock(
        {
          type: 'paragraph',
          content: [{ type: 'custom-change', changed: true }],
        },
        registry
      )
    ).toBe(true);
  });

  it('所有 inline owner 显式声明 AI Diff presence 与正文批注策略', () => {
    expect([...notePluginRegistry.inlinePlugins.values()]).toHaveLength(8);
    for (const owner of notePluginRegistry.inlinePlugins.values()) {
      expect(owner.aiDiff).toBeDefined();
      expect(owner.comments).toBeDefined();
    }

    expect(notePluginRegistry.inlinePlugins.get('text')?.comments.canCreateDocumentThread).toBe(
      true
    );
    expect(
      notePluginRegistry.inlinePlugins.get('inlineMath')?.comments.canCreateDocumentThread
    ).toBe(true);
    expect(notePluginRegistry.inlinePlugins.get('ai-diff')?.comments.canCreateDocumentThread).toBe(
      false
    );
  });
});
