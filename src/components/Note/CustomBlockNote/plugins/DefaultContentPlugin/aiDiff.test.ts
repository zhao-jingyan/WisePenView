import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { notePluginRegistry } from '..';
import { normalizeAiGeneratedBlocks } from '../runtime/aiDiff/normalizeGeneratedBlocks';

describe('DefaultContentPlugin AI Diff', () => {
  it('由 paragraph owner 规范化富文本差异', () => {
    expect(
      normalizeAiGeneratedBlocks(
        [
          {
            id: 'paragraph-1',
            type: 'paragraph',
            props: { textAlignment: 'left' },
            content: [{ type: 'AI-Edit', old_text: '旧', new_text: '新' }],
            children: [],
          },
        ],
        notePluginRegistry
      )
    ).toEqual([
      {
        id: 'paragraph-1',
        type: 'paragraph',
        props: { textAlignment: 'left' },
        content: [
          {
            type: 'ai-diff',
            props: {
              origin: '旧',
              replace: '新',
              key: expect.stringContaining(':c1'),
              granularity: 'word',
            },
          },
        ],
        children: [],
      },
    ]);
  });

  it('由 link owner 恢复普通生成内容', () => {
    const result = normalizeAiGeneratedBlocks(
      [
        {
          id: 'paragraph-link',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'link',
              href: '/docs',
              content: [{ type: 'text', text: '文档', styles: { bold: 'true' } }],
            },
          ],
          children: [],
        },
      ],
      notePluginRegistry
    );

    expect(result?.[0]).toMatchObject({
      content: [
        {
          type: 'link',
          href: '/docs',
          content: [{ type: 'text', text: '文档', styles: { bold: 'true' } }],
        },
      ],
    });
  });

  it('由 paragraph owner 决定批量拒绝后可删除空块', () => {
    const owner = notePluginRegistry.blockPlugins.get('paragraph');
    expect(
      owner?.aiDiff?.applyAll(
        {
          type: 'paragraph',
          props: {},
          content: [{ type: 'ai-add', props: { text: '新增', key: 'change-1' } }],
          children: [],
        },
        'discard',
        notePluginRegistry
      )
    ).toEqual({ kind: 'update', content: [], removeWhenChildless: true });
  });

  it('由 toggleListItem owner 决定折叠子块的新增锚点', () => {
    const owner = notePluginRegistry.blockPlugins.get('toggleListItem');
    expect(
      owner?.aiDiff?.getFoldedChildrenAnchorId?.(
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
      )
    ).toBe('first-hidden-child');
  });
});
