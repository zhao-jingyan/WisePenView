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
});
