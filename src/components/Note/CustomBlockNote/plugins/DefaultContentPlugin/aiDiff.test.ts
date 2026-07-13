/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { hashNoteBlockForAiDiff } from '../../engines/aiDiff/projection';
import { notePluginRegistry } from '../../noteEditorComposition';

describe('DefaultContentPlugin AI Diff', () => {
  it('由 paragraph owner 解析 native candidate', () => {
    const block = {
      id: 'paragraph-1',
      type: 'paragraph',
      props: { textAlignment: 'left' },
      content: [{ type: 'text', text: '旧', styles: {} }],
      children: [],
    };
    const projection = notePluginRegistry.blockPlugins.get('paragraph')?.aiDiff?.resolve(
      block,
      {
        revision: 'r1',
        baseHash: hashNoteBlockForAiDiff(block),
        operation: 'update',
        candidate: {
          props: { textAlignment: 'left' },
          content: [{ type: 'text', text: '新', styles: {} }],
        },
      },
      notePluginRegistry
    );

    expect(projection).toEqual({
      current: block,
      candidate: { ...block, content: [{ type: 'text', text: '新', styles: {} }] },
      stale: false,
    });
  });

  it('富文本 block 委托 inline owner 渲染文本与链接候选', () => {
    const candidate = {
      type: 'paragraph',
      props: {},
      content: [
        { type: 'text', text: '访问 ', styles: {} },
        {
          type: 'link',
          href: '/docs',
          content: [{ type: 'text', text: '文档', styles: {} }],
        },
      ],
    };
    const preview = notePluginRegistry.blockPlugins
      .get('paragraph')
      ?.aiDiff?.renderCandidate(candidate, notePluginRegistry);

    expect(preview?.textContent).toBe('访问 文档');
    expect(preview?.querySelector('a')?.getAttribute('href')).toContain('/docs');
  });

  it('普通自然段以词句粒度渲染局部修改', () => {
    const actionTargets: unknown[] = [];
    const comparison = notePluginRegistry.blockPlugins.get('paragraph')?.aiDiff?.renderComparison?.(
      {
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: '团队将在月底完成首次复盘。', styles: {} }],
      },
      {
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: '团队仍将在月底完成最终复盘。', styles: {} }],
      },
      notePluginRegistry,
      {
        renderAcceptAction: (target) => {
          actionTargets.push(target);
          const button = document.createElement('button');
          button.dataset.testAcceptHunk = 'true';
          return button;
        },
      }
    );

    expect(comparison?.dataset.aiDiffGranularity).toBe('word');
    expect(comparison?.querySelector('[data-ai-diff-word-role="delete"]')?.textContent).toBe(
      '首次'
    );
    expect(
      [...(comparison?.querySelectorAll('[data-ai-diff-word-role="insert"]') ?? [])]
        .map((element) => element.textContent)
        .join('')
    ).toContain('最终');
    expect(comparison?.textContent).toContain('团队');
    expect(comparison?.querySelectorAll('[data-ai-diff-hunk="true"]')).toHaveLength(2);
    expect(comparison?.querySelectorAll('[data-test-accept-hunk="true"]')).toHaveLength(2);
    expect(actionTargets).toEqual([
      { kind: 'text-hunk', index: 0 },
      { kind: 'text-hunk', index: 1 },
    ]);
  });

  it('只有 block 属性变化时不启用词级对比', () => {
    const aiDiff = notePluginRegistry.blockPlugins.get('paragraph')?.aiDiff;
    expect(
      aiDiff?.shouldRenderComparison?.(
        {
          type: 'paragraph',
          props: { textAlignment: 'left' },
          content: [{ type: 'text', text: '正文不变', styles: {} }],
        },
        {
          type: 'paragraph',
          props: { textAlignment: 'center' },
          content: [{ type: 'text', text: '正文不变', styles: {} }],
        },
        notePluginRegistry
      )
    ).toBe(false);
  });
});
