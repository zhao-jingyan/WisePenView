import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../../noteEditorComposition';
import { acceptInlineTextHunk } from './inlineDiff';

describe('DefaultContentPlugin 局部 AI Diff', () => {
  it('接受单个 hunk 时保留范围外样式并采用候选链接结构', () => {
    const content = acceptInlineTextHunk({
      current: [
        { type: 'text', text: '保留 ', styles: { bold: true } },
        {
          type: 'link',
          href: '/old',
          content: [{ type: 'text', text: 'legacy-link', styles: { italic: true } }],
        },
        { type: 'text', text: ' 结尾', styles: { underline: true } },
      ],
      candidate: [
        { type: 'text', text: '保留 ', styles: {} },
        {
          type: 'link',
          href: '/new',
          content: [{ type: 'text', text: 'modern-doc', styles: { bold: true } }],
        },
        { type: 'text', text: ' 结尾', styles: {} },
      ],
      hunkIndex: 0,
      registry: notePluginRegistry,
    });

    expect(content).toEqual([
      { type: 'text', text: '保留 ', styles: { bold: true } },
      {
        type: 'link',
        href: '/new',
        content: [{ type: 'text', text: 'modern-doc', styles: { bold: true } }],
      },
      { type: 'text', text: ' 结尾', styles: { underline: true } },
    ]);
  });
});
