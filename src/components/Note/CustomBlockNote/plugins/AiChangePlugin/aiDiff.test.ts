import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { notePluginRegistry } from '..';

describe('AiChangePlugin', () => {
  it.each([
    [
      'ai-diff',
      { origin: '旧', replace: '新' },
      'accept',
      [{ type: 'text', text: '新', styles: {} }],
    ],
    ['ai-add', { text: '新增' }, 'discard', []],
    ['ai-delete', { text: '删除' }, 'discard', [{ type: 'text', text: '删除', styles: {} }]],
    [
      'ai-link-add',
      { text: '链接', href: '/docs' },
      'accept',
      [
        {
          type: 'link',
          href: '/docs',
          content: [{ type: 'text', text: '链接', styles: {} }],
        },
      ],
    ],
    ['ai-link-delete', { text: '链接', href: '/docs' }, 'accept', []],
  ] as const)('由 %s owner 应用 %s', (type, props, action, expected) => {
    expect(
      notePluginRegistry.inlinePlugins.get(type)?.aiDiff.apply({ type, props }, action)
    ).toEqual(expected);
  });

  it('由语法 owner 判断 presence 与非对比模式可见性', () => {
    const owner = notePluginRegistry.inlinePlugins.get('ai-add');
    expect(owner?.aiDiff.isPresent({ type: 'ai-add', props: { text: '新增' } })).toBe(true);
    expect(
      owner?.aiDiff.isVisible(
        { type: 'ai-add', props: { text: '新增' } },
        AI_DIFF_DISPLAY_MODE.OLD_ONLY
      )
    ).toBe(false);
    expect(owner?.aiDiff.reviewChange).toBe(true);
  });
});
