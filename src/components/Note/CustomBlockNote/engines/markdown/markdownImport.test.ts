/** @vitest-environment jsdom */
import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { blockNoteSchema, notePluginRegistry } from '../../noteEditorComposition';
import { exportNoteMarkdown } from './markdownExport';
import { importNoteMarkdown } from './markdownImport';

function createEditor() {
  return BlockNoteEditor.create({ schema: blockNoteSchema });
}

function propsOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

describe('importNoteMarkdown', () => {
  it('保留 BlockNote 默认语义并由公式 owner 恢复自定义内容', () => {
    const editor = createEditor();
    const markdown = [
      '# 标题',
      '',
      '正文 $x + y$，保留 `$code$`、\\$literal\\$ 和 [链接 $ignored$](https://example.com)。',
      '',
      '$$',
      'x^2 +',
      'y^2',
      '$$',
      '',
      '~~~ts',
      '$codeBlock$',
      '~~~',
    ].join('\n');

    const blocks = importNoteMarkdown(editor, notePluginRegistry, markdown);

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'math',
      'codeBlock',
    ]);
    const paragraphContent = blocks[1].content;
    expect(paragraphContent).toEqual([
      { type: 'text', text: '正文 ', styles: {} },
      {
        type: 'inlineMath',
        props: {
          expression: 'x + y',
          autoOpenEdit: false,
        },
      },
      { type: 'text', text: '，保留 ', styles: {} },
      { type: 'text', text: '$code$', styles: { code: true } },
      { type: 'text', text: '、$literal$ 和 ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com',
        content: [{ type: 'text', text: '链接 $ignored$', styles: {} }],
      },
      { type: 'text', text: '。', styles: {} },
    ]);
    expect(propsOf(blocks[2].props).expression).toBe('x^2 +\ny^2');
    expect(blocks[3].content).toEqual([{ type: 'text', text: '$codeBlock$', styles: {} }]);
  });

  it('按现有导出语法完成 math 与 inlineMath roundtrip', () => {
    const editor = createEditor();
    const sourceBlocks = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '公式 ', styles: {} },
          { type: 'inlineMath', props: { expression: 'x + y' } },
          { type: 'text', text: ' 结束', styles: {} },
        ],
      },
      {
        type: 'math',
        props: { expression: 'a^2 +\nb^2' },
      },
    ] as unknown as Parameters<typeof editor.replaceBlocks>[1];
    editor.replaceBlocks(editor.document, sourceBlocks);

    const markdown = exportNoteMarkdown(editor, notePluginRegistry);
    expect(markdown).toContain('$x + y$');
    expect(markdown).toContain('$$\na^2 +\nb^2\n$$');

    const imported = importNoteMarkdown(editor, notePluginRegistry, markdown);
    const paragraph = imported.find((block) => block.type === 'paragraph');
    const math = imported.find((block) => block.type === 'math');
    expect(paragraph?.content).toContainEqual({
      type: 'inlineMath',
      props: {
        expression: 'x + y',
        autoOpenEdit: false,
      },
    });
    expect(propsOf(math?.props).expression).toBe('a^2 +\nb^2');
  });
});
