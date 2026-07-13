import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '..';
import { aiGeneratedBlocksToBlockNoteBlocks } from './patch';

describe('aiGeneratedBlocksToBlockNoteBlocks', () => {
  it('由富文本 block owner 规范化 inline diff', () => {
    const result = aiGeneratedBlocksToBlockNoteBlocks(
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
    );

    expect(result).toEqual([
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

  it('由 math owner 将公式 diff 写入原子 props', () => {
    const result = aiGeneratedBlocksToBlockNoteBlocks(
      [
        {
          id: 'math-1',
          type: 'math',
          props: {},
          content: [{ type: 'AI-Edit', old_text: 'x', new_text: 'y' }],
          children: [],
        },
      ],
      notePluginRegistry
    );

    expect(result).toEqual([
      {
        id: 'math-1',
        type: 'math',
        props: {
          expression: 'y',
          aiDiffType: 'edit',
          aiDiffKey: expect.stringContaining(':math'),
          aiDiffOrigin: 'x',
          aiDiffReplace: 'y',
        },
        children: [],
      },
    ]);
  });

  it('由 link 与 inlineMath owner 恢复普通生成内容', () => {
    const result = aiGeneratedBlocksToBlockNoteBlocks(
      [
        {
          id: 'paragraph-owners',
          type: 'paragraph',
          props: {},
          content: [
            {
              type: 'link',
              href: '/docs',
              content: [{ type: 'text', text: '文档', styles: { bold: 'true' } }],
            },
            {
              type: 'inlineMath',
              props: {
                expression: 'x^2',
                aiDiffType: 'edit',
                aiDiffOrigin: 'x',
                aiDiffReplace: 'x^2',
              },
            },
          ],
          children: [],
        },
      ],
      notePluginRegistry
    );

    expect(result).toEqual([
      {
        id: 'paragraph-owners',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'link',
            href: '/docs',
            content: [{ type: 'text', text: '文档', styles: { bold: 'true' } }],
          },
          {
            type: 'inlineMath',
            props: {
              expression: 'x^2',
              autoOpenEdit: false,
              aiDiffType: 'edit',
              aiDiffKey: expect.stringContaining(':c2'),
              aiDiffOrigin: 'x',
              aiDiffReplace: 'x^2',
            },
          },
        ],
        children: [],
      },
    ]);
  });

  it('普通生成 inline 没有 owner adapter 时整体失败', () => {
    expect(
      aiGeneratedBlocksToBlockNoteBlocks(
        [
          {
            id: 'paragraph-unknown-inline',
            type: 'paragraph',
            props: {},
            content: [{ type: 'unknown-inline', props: {} }],
            children: [],
          },
        ],
        notePluginRegistry
      )
    ).toBeNull();
  });

  it.each(['codeBlock', 'table', 'unknown'])('拒绝没有 AI Diff owner 实现的 %s 块', (type) => {
    expect(
      aiGeneratedBlocksToBlockNoteBlocks(
        [{ id: 'unsupported', type, props: {}, content: [], children: [] }],
        notePluginRegistry
      )
    ).toBeNull();
  });

  it('任一嵌套块不受支持时整体失败而不是静默丢失 child', () => {
    expect(
      aiGeneratedBlocksToBlockNoteBlocks(
        [
          {
            id: 'parent',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: '父块' }],
            children: [{ id: 'child', type: 'codeBlock', props: {}, content: [], children: [] }],
          },
        ],
        notePluginRegistry
      )
    ).toBeNull();
  });

  it('由富文本 owner 批量拒绝新增内容并标记可删除空块', () => {
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

  it('由 math owner 批量接受公式修改', () => {
    const owner = notePluginRegistry.blockPlugins.get('math');
    expect(
      owner?.aiDiff?.applyAll(
        {
          type: 'math',
          props: {
            expression: 'y',
            aiDiffType: 'edit',
            aiDiffKey: 'change-2',
            aiDiffOrigin: 'x',
            aiDiffReplace: 'y',
          },
          children: [],
        },
        'accept',
        notePluginRegistry
      )
    ).toEqual({
      kind: 'update',
      props: {
        expression: 'y',
        aiDiffType: '',
        aiDiffKey: '',
        aiDiffOrigin: '',
        aiDiffReplace: '',
      },
    });
  });
});
