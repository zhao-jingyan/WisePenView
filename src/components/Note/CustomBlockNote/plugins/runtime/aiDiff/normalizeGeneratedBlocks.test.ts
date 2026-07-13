import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../..';
import { normalizeAiGeneratedBlocks } from './normalizeGeneratedBlocks';

describe('normalizeAiGeneratedBlocks', () => {
  it('任一 inline owner 拒绝生成内容时整体失败', () => {
    expect(
      normalizeAiGeneratedBlocks(
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
      normalizeAiGeneratedBlocks(
        [{ id: 'unsupported', type, props: {}, content: [], children: [] }],
        notePluginRegistry
      )
    ).toBeNull();
  });

  it('嵌套块不受支持时整体失败而不是静默丢失 child', () => {
    expect(
      normalizeAiGeneratedBlocks(
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
});
