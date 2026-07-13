import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { notePluginRegistry } from '..';
import { normalizeAiGeneratedBlocks } from '../runtime/aiDiff/normalizeGeneratedBlocks';
import { hasAiDiffInBlock } from '../runtime/aiDiff/presence';

describe('LatexPlugin AI Diff', () => {
  it('由 MathBlock owner 将生成差异写入公式 props', () => {
    expect(
      normalizeAiGeneratedBlocks(
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
      )
    ).toEqual([
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

  it('由 InlineMath owner 恢复普通生成内容', () => {
    const result = normalizeAiGeneratedBlocks(
      [
        {
          id: 'paragraph-formula',
          type: 'paragraph',
          props: {},
          content: [
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

    expect(result?.[0]).toMatchObject({
      content: [
        {
          type: 'inlineMath',
          props: {
            expression: 'x^2',
            autoOpenEdit: false,
            aiDiffType: 'edit',
            aiDiffKey: expect.stringContaining(':c1'),
            aiDiffOrigin: 'x',
            aiDiffReplace: 'x^2',
          },
        },
      ],
    });
  });

  it('由 MathBlock owner 接受公式修改', () => {
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

  it('由公式 owner 判断 block 与 inline 差异存在性', () => {
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
      notePluginRegistry.inlinePlugins
        .get('inlineMath')
        ?.aiDiff.isVisible(
          { type: 'inlineMath', props: { aiDiffType: 'delete', aiDiffOrigin: 'x' } },
          AI_DIFF_DISPLAY_MODE.NEW_ONLY
        )
    ).toBe(false);
  });
});
