/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '../../noteEditorComposition';

describe('CodeBlockPlugin AiDiffView', () => {
  it('使用原生代码块 DOM 契约渲染语言和内容', () => {
    const preview = notePluginRegistry.blockPlugins.get('codeBlock')?.aiDiff?.renderCandidate(
      {
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [{ type: 'text', text: 'const answer = 42;', styles: {} }],
      },
      notePluginRegistry
    );

    expect(preview?.matches('.bn-block-content[data-content-type="codeBlock"]')).toBe(true);
    expect(preview?.querySelector('.wise-code-block-languageLabel')?.textContent).toBe(
      'TypeScript'
    );
    expect(preview?.querySelector('code')?.dataset.language).toBe('typescript');
    expect(preview?.querySelector('code')?.textContent).toBe('const answer = 42;');
    expect(preview?.dataset.readOnly).toBe('true');
    expect(preview?.querySelector('.wise-code-block-languageButton')).not.toBeNull();
    expect(preview?.querySelector('.wise-code-block-actions')).toBeNull();
    expect(preview?.querySelector('button')).toBeNull();
  });

  it('保留未注册语言标识', () => {
    const preview = notePluginRegistry.blockPlugins.get('codeBlock')?.aiDiff?.renderCandidate(
      {
        type: 'codeBlock',
        props: { language: 'custom-lang' },
        content: [],
      },
      notePluginRegistry
    );

    expect(preview?.querySelector('.wise-code-block-languageLabel')?.textContent).toBe(
      'custom-lang'
    );
    expect(preview?.querySelector('code')?.classList.contains('language-custom-lang')).toBe(true);
  });

  it('compare 模式按行渲染代码差异，不再生成整块增删色', () => {
    const aiDiff = notePluginRegistry.blockPlugins.get('codeBlock')?.aiDiff;
    const comparison = aiDiff?.renderComparison?.(
      {
        type: 'codeBlock',
        props: { language: 'javascript' },
        content: [{ type: 'text', text: 'const value = 1;\nkeep();', styles: {} }],
      },
      {
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [{ type: 'text', text: 'const value = 2;\nkeep();', styles: {} }],
      },
      notePluginRegistry
    );

    expect(comparison?.querySelector('.wise-code-block-languageLabel')?.textContent).toBe(
      'TypeScript'
    );
    const lines = [...(comparison?.querySelectorAll('[data-diff-kind]') ?? [])];
    expect(lines.map((line) => line.getAttribute('data-diff-kind'))).toEqual([
      'delete',
      'insert',
      'equal',
    ]);
    expect(lines.map((line) => line.lastElementChild?.textContent)).toEqual([
      'const value = 1;',
      'const value = 2;',
      'keep();',
    ]);
    expect(lines.map((line) => line.getAttribute('data-line-number'))).toEqual(['1', '1', '2']);
    expect(lines.every((line) => line.children.length === 3)).toBe(true);
  });
});
