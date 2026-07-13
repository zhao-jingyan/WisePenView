import { describe, expect, it } from 'vitest';

import { buildAiDiffTextHunks, tokenizeAiDiffText } from './wordDiff';

function restoreText(hunks: ReturnType<typeof buildAiDiffTextHunks>, side: 'old' | 'new'): string {
  return hunks
    .flatMap((hunk) => hunk.segments)
    .filter((segment) => segment.kind !== (side === 'old' ? 'insert' : 'delete'))
    .map((segment) => segment.text)
    .join('');
}

describe('AI Diff 词句分段', () => {
  it('处理中英文词语并保持新旧文本守恒', () => {
    const origin = '团队将在月底 review the first report。';
    const replacement = '团队仍将在月底 review the final report。';
    const hunks = buildAiDiffTextHunks(origin, replacement);

    expect(tokenizeAiDiffText(origin).join('')).toBe(origin);
    expect(restoreText(hunks, 'old')).toBe(origin);
    expect(restoreText(hunks, 'new')).toBe(replacement);
    expect(hunks.flatMap((hunk) => hunk.segments).map((segment) => segment.kind)).toEqual(
      expect.arrayContaining(['equal', 'delete', 'insert'])
    );
    for (const hunk of hunks) {
      expect(origin.slice(hunk.originFrom, hunk.originTo)).toBe(
        hunk.segments
          .filter((segment) => segment.kind !== 'insert')
          .map((segment) => segment.text)
          .join('')
      );
      expect(replacement.slice(hunk.replacementFrom, hunk.replacementTo)).toBe(
        hunk.segments
          .filter((segment) => segment.kind !== 'delete')
          .map((segment) => segment.text)
          .join('')
      );
    }
  });

  it('在句子边界拆分相邻修改', () => {
    const hunks = buildAiDiffTextHunks(
      '第一句采用旧方案。第二句保留上下文，第三句使用旧指标。',
      '第一句采用新方案。第二句保留上下文，第三句使用新指标。'
    );

    expect(hunks.filter((hunk) => hunk.mode === 'hunk')).toHaveLength(2);
    expect(
      hunks.some(
        (hunk) => hunk.mode === 'outside' && hunk.segments.some((item) => item.text.includes('。'))
      )
    ).toBe(true);
  });

  it('长文本使用线性降级且保留公共前后文', () => {
    const prefix = `${'公共前文 '.repeat(260)}。`;
    const suffix = `。${'公共后文 '.repeat(260)}`;
    const origin = `${prefix}旧的中间结论${suffix}`;
    const replacement = `${prefix}新的中间结论${suffix}`;
    const hunks = buildAiDiffTextHunks(origin, replacement);

    expect(restoreText(hunks, 'old')).toBe(origin);
    expect(restoreText(hunks, 'new')).toBe(replacement);
    expect(hunks.filter((hunk) => hunk.mode === 'hunk')).toHaveLength(1);
  });
});
