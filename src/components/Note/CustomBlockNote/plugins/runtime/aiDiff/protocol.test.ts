import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../..';
import { normalizeAiGeneratedBlocks } from './normalizeGeneratedBlocks';
import { aiProtoBlocksToAiGeneratedBlocks } from './protocol';

function normalizeProtocol(input: unknown) {
  const generated = aiProtoBlocksToAiGeneratedBlocks(input, notePluginRegistry);
  return generated ? normalizeAiGeneratedBlocks(generated, notePluginRegistry) : null;
}

describe('AI Diff protocol runtime', () => {
  it('由 text owner 将协议正文转换为编辑器差异节点', () => {
    const result = normalizeProtocol([
      {
        id: 'paragraph-1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: '旧', styles: {} }],
        'AI-content': [{ type: 'text', text: '新', styles: {} }],
        children: [],
      },
    ]);

    expect(result?.[0]).toMatchObject({
      type: 'paragraph',
      content: [
        {
          type: 'ai-diff',
          props: { origin: '旧', replace: '新', key: expect.any(String) },
        },
      ],
    });
  });

  it('由 link owner 将协议新增链接转换为对应 change content', () => {
    const result = normalizeProtocol([
      {
        id: 'paragraph-link',
        type: 'paragraph',
        props: {},
        content: [],
        'AI-content': [
          {
            type: 'link',
            href: '/docs',
            content: [{ type: 'text', text: '文档', styles: { bold: 'true' } }],
          },
        ],
        children: [],
      },
    ]);

    expect(result?.[0]).toMatchObject({
      content: [
        {
          type: 'ai-link-add',
          props: { text: '文档', href: '/docs', key: expect.any(String) },
        },
      ],
    });
  });

  it('由 InlineMath 与 MathBlock owner 处理各自协议语义', () => {
    const result = normalizeProtocol([
      {
        id: 'paragraph-formula',
        type: 'paragraph',
        props: {},
        content: [{ type: 'inlineMath', props: { expression: 'x' } }],
        'AI-content': [{ type: 'inlineMath', props: { expression: 'y' } }],
        children: [],
      },
      {
        id: 'math-block',
        type: 'math',
        props: { expression: 'x' },
        content: [{ type: 'text', text: 'x', styles: {} }],
        'AI-content': [{ type: 'text', text: 'y', styles: {} }],
        children: [],
      },
    ]);

    expect(result?.[0]).toMatchObject({
      content: [
        {
          type: 'inlineMath',
          props: { expression: 'y', aiDiffType: 'edit', aiDiffOrigin: 'x', aiDiffReplace: 'y' },
        },
      ],
    });
    expect(result?.[1]).toMatchObject({
      props: { expression: 'y', aiDiffType: 'edit', aiDiffOrigin: 'x', aiDiffReplace: 'y' },
    });
  });

  it('协议层拒绝没有 AI Diff owner 的块', () => {
    expect(
      aiProtoBlocksToAiGeneratedBlocks(
        [{ id: 'table-1', type: 'table', props: {}, content: [], children: [] }],
        notePluginRegistry
      )
    ).toBeNull();
  });
});
