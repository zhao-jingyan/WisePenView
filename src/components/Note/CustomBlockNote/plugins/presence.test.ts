import { defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { notePluginRegistry } from '.';
import { hasAiDiffInBlock, shouldFoldAiDiffInlineContent } from './presence';
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
      contentModel: 'inline',
      spec: defaultBlockSpecs.paragraph,
      capabilities: unsupportedCapabilities,
      comments: { documentThreads: 'unsupported' },
    } satisfies NoteBlockPlugin;
    const customInlineOwner = {
      kind: 'inline',
      id: 'test.inline.change',
      type: 'custom-change',
      spec: defaultInlineContentSpecs.text,
      capabilities: {
        ...unsupportedCapabilities,
        aiDiff: { support: 'custom' },
      },
      aiDiff: {
        isPresent: (inline) => inline.changed === true,
        isVisible: () => true,
        apply: () => undefined,
      },
      comments: { documentThreads: 'unsupported' },
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

    expect(notePluginRegistry.inlinePlugins.get('text')?.comments.documentThreads).toBe('range');
    expect(notePluginRegistry.inlinePlugins.get('inlineMath')?.comments.documentThreads).toBe(
      'dedicated'
    );
    expect(notePluginRegistry.inlinePlugins.get('ai-diff')?.comments.documentThreads).toBe(
      'unsupported'
    );
  });

  it('由 inline owner 决定非对比模式下是否折叠整个块', () => {
    const content = [{ type: 'ai-add', props: { text: '新增', key: 'change-1' } }];

    expect(
      shouldFoldAiDiffInlineContent(content, AI_DIFF_DISPLAY_MODE.OLD_ONLY, notePluginRegistry)
    ).toBe(true);
    expect(
      shouldFoldAiDiffInlineContent(content, AI_DIFF_DISPLAY_MODE.NEW_ONLY, notePluginRegistry)
    ).toBe(false);
  });

  it('由 toggleListItem owner 决定全部折叠子块的新增锚点', () => {
    const owner = notePluginRegistry.blockPlugins.get('toggleListItem');
    const anchorId = owner?.aiDiff?.getFoldedChildrenAnchorId?.(
      {
        type: 'toggleListItem',
        children: [
          {
            id: 'first-hidden-child',
            type: 'paragraph',
            content: [{ type: 'ai-add', props: { text: '新增' } }],
          },
        ],
      },
      AI_DIFF_DISPLAY_MODE.OLD_ONLY,
      notePluginRegistry
    );

    expect(anchorId).toBe('first-hidden-child');
  });
});
