/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { hashNoteBlockForAiDiff } from '../../engines/aiDiff/projection';
import { notePluginRegistry } from '../../noteEditorComposition';

describe('LatexPlugin AI Diff', () => {
  it('MathBlock owner 直接比较 expression candidate', () => {
    const block = {
      id: 'math-1',
      type: 'math',
      props: { expression: 'x', autoEdit: false },
      content: [],
      children: [],
    };
    const projection = notePluginRegistry.blockPlugins.get('math')?.aiDiff?.resolve(
      block,
      {
        revision: 'r1',
        baseHash: hashNoteBlockForAiDiff(block),
        operation: 'update',
        candidate: { props: { expression: 'y', autoEdit: false }, content: [] },
      },
      notePluginRegistry
    );

    expect(projection?.candidate?.props).toEqual({ expression: 'y', autoEdit: false });
    expect(projection?.stale).toBe(false);
  });

  it('block 与 inline owner 各自渲染 KaTeX 候选', () => {
    const mathPreview = notePluginRegistry.blockPlugins
      .get('math')
      ?.aiDiff?.renderCandidate({ type: 'math', props: { expression: 'x^2' } }, notePluginRegistry);
    const inlinePreview = notePluginRegistry.inlinePlugins
      .get('inlineMath')
      ?.aiDiff.renderCandidate(
        { type: 'inlineMath', props: { expression: 'y_1' } },
        notePluginRegistry
      );

    expect(mathPreview?.querySelector('.katex')).not.toBeNull();
    expect(inlinePreview?.querySelector('.katex')).not.toBeNull();
  });
});
