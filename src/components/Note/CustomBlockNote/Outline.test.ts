import { describe, expect, it } from 'vitest';

import { buildOutlineProjection, resolveActiveHeadingId } from './Outline';

describe('Note outline projection', () => {
  it('通过 inline owner 聚合标题文本', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 2 },
        content: [
          { type: 'text', text: '算法 ', styles: {} },
          { type: 'link', href: '/docs', content: [{ type: 'text', text: '文档', styles: {} }] },
          { type: 'inlineMath', props: { expression: 'x^2' } },
          { type: 'ai-add', props: { text: ' 新增' } },
        ],
      },
    ];
    const editor = {
      forEachBlock(visitor: (block: (typeof blocks)[number]) => boolean) {
        blocks.forEach(visitor);
      },
    };

    expect(buildOutlineProjection(editor as never)).toEqual({
      items: [{ id: 'heading-1', level: 2, text: '算法 文档x^2 新增' }],
      flatBlocks: [{ id: 'heading-1', outline: true }],
    });
  });

  it('根据 owner 的 outline capability 回溯活动标题', () => {
    expect(
      resolveActiveHeadingId(
        [
          { id: 'title', outline: true },
          { id: 'paragraph', outline: false },
          { id: 'nested', outline: false },
        ],
        'nested'
      )
    ).toBe('title');
  });
});
