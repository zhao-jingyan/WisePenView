import { describe, expect, it } from 'vitest';

import { buildCodeLineDiff } from './lineDiff';

describe('CodeBlockPlugin 行级 AI Diff', () => {
  it('按完整代码行保留上下文并分别编号', () => {
    const entries = buildCodeLineDiff(
      ['const answer = 41;', 'keep();', 'remove();'].join('\n'),
      ['const answer = 42;', 'keep();', 'add();'].join('\n')
    );

    expect(entries.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: 'delete', text: 'const answer = 41;' },
      { kind: 'insert', text: 'const answer = 42;' },
      { kind: 'equal', text: 'keep();' },
      { kind: 'delete', text: 'remove();' },
      { kind: 'insert', text: 'add();' },
    ]);
    expect(
      entries.map(({ oldLineNumber, newLineNumber }) => [oldLineNumber, newLineNumber])
    ).toEqual([
      [1, undefined],
      [undefined, 1],
      [2, 2],
      [3, undefined],
      [undefined, 3],
    ]);
  });

  it('空代码更新为多行代码时只生成新增行', () => {
    expect(buildCodeLineDiff('', 'first\nsecond')).toEqual([
      { kind: 'insert', text: 'first', newLineNumber: 1 },
      { kind: 'insert', text: 'second', newLineNumber: 2 },
    ]);
  });
});
