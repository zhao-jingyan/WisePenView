import { codeBlockOptions } from '@blocknote/code-block';
import { createCodeBlockSpec } from '@blocknote/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import type { NoteBlockPlugin } from '../../content/types';
import { CodeBlockAiContentView, CodeBlockAiDiffComparisonView } from './AiDiffView';
import { CodeBlockToolbar } from './CodeBlockToolbar';
import { getCodeBlockLanguageOptions } from './language';

const CODE_BLOCK_THEME = 'github-light';

const collapsedCodeBlockIds = new Set<string>();

function syncPreCollapsed(preElement: HTMLPreElement, collapsed: boolean) {
  if (collapsed) {
    preElement.dataset.collapsed = 'true';
    return;
  }
  delete preElement.dataset.collapsed;
}

async function createLightCodeBlockHighlighter() {
  const highlighter = await codeBlockOptions.createHighlighter();
  const getLoadedThemes = highlighter.getLoadedThemes.bind(highlighter);

  // BlockNote 0.47 的 Shiki parser 默认使用 loadedThemes[0]，这里把浅色主题前置。
  highlighter.getLoadedThemes = () => {
    const themes = getLoadedThemes();
    if (!themes.includes(CODE_BLOCK_THEME)) {
      return themes;
    }
    return [CODE_BLOCK_THEME, ...themes.filter((theme) => theme !== CODE_BLOCK_THEME)];
  };

  return highlighter;
}

const baseCodeBlockSpec = createCodeBlockSpec({
  ...codeBlockOptions,
  createHighlighter: createLightCodeBlockHighlighter,
  defaultLanguage: 'text',
});

type CodeBlockRenderContext = ThisParameterType<typeof baseCodeBlockSpec.implementation.render>;

export const codeBlockPlugin = {
  kind: 'block',
  id: 'codeBlock',
  type: 'codeBlock',
  contentModel: 'inline',
  spec: {
    ...baseCodeBlockSpec,
    implementation: {
      ...baseCodeBlockSpec.implementation,
      render(this: CodeBlockRenderContext, block, editor) {
        const baseRender = baseCodeBlockSpec.implementation.render.call(this, block, editor);

        const toolbarWrapper = baseRender.dom.firstChild;
        const codeElement = baseRender.contentDOM;
        const preElement = codeElement?.parentElement;
        if (
          !(toolbarWrapper instanceof HTMLElement) ||
          !codeElement ||
          !(preElement instanceof HTMLPreElement)
        ) {
          return baseRender;
        }

        const language = block.props.language || 'text';
        const collapsed = collapsedCodeBlockIds.has(block.id);
        const toolbarHost = document.createElement('div');
        const reactRoot = createRoot(toolbarHost);

        syncPreCollapsed(preElement, collapsed);
        toolbarWrapper.className = 'wise-code-block-toolbarWrapper';
        toolbarWrapper.dataset.wiseCodeBlockToolbar = '';
        toolbarWrapper.replaceChildren(toolbarHost);

        flushSync(() => {
          reactRoot.render(
            <CodeBlockToolbar
              codeElement={codeElement}
              collapsed={collapsed}
              isEditable={editor.isEditable}
              language={language}
              languageOptions={getCodeBlockLanguageOptions(language)}
              onCollapsedChange={(collapsed) => {
                if (collapsed) {
                  collapsedCodeBlockIds.add(block.id);
                } else {
                  collapsedCodeBlockIds.delete(block.id);
                }
                syncPreCollapsed(preElement, collapsed);
              }}
              onLanguageChange={(nextLanguage) => {
                editor.updateBlock(block.id, { props: { language: nextLanguage } });
              }}
            />
          );
        });

        return {
          ...baseRender,
          ignoreMutation: (mutation) => {
            if (mutation.target instanceof Node && toolbarWrapper.contains(mutation.target)) {
              return true;
            }
            return baseRender.ignoreMutation?.(mutation) ?? false;
          },
          destroy: () => {
            reactRoot.unmount();
            baseRender.destroy?.();
          },
        };
      },
    },
  },
  capabilities: {
    markdownImport: { support: 'default' },
    markdownExport: { support: 'default' },
    aiDiff: { support: 'custom' },
    projection: { support: 'default' },
    print: { support: 'custom' },
  },
  inlineComment: { mode: 'range' },
  aiDiff: {
    renderAiContent: CodeBlockAiContentView,
    comparison: {
      render: CodeBlockAiDiffComparisonView,
    },
  },
  print: {
    styles: [
      `.note-print-body .bn-block-content[data-content-type='codeBlock'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.note-print-body .bn-block-content[data-content-type='codeBlock'] > pre {
  overflow: visible !important;
  white-space: pre-wrap !important;
  overflow-wrap: anywhere;
}`,
    ],
  },
} satisfies NoteBlockPlugin;
