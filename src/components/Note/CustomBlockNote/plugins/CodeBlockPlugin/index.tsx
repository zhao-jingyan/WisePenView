import { codeBlockOptions } from '@blocknote/code-block';
import { createCodeBlockSpec } from '@blocknote/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { getCodeBlockHighlighter, normalizeCodeLanguage } from '@/utils/codeHighlight';

import type { NoteBlockPlugin } from '../../registry/types';
import { CodeBlockAiContentView, CodeBlockAiDiffComparisonView } from './AiDiffView';
import { CodeBlockToolbar } from './CodeBlockToolbar';
import { getCodeBlockLanguageOptions } from './language';

const collapsedCodeBlockIds = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeImportedCodeBlockLanguage(block: Record<string, unknown>) {
  if (block.type !== 'codeBlock') return undefined;
  if (!isRecord(block.props)) return undefined;
  const language = block.props.language;
  if (typeof language !== 'string') return undefined;

  const normalizedLanguage = normalizeCodeLanguage(language);
  if (normalizedLanguage === language) return undefined;
  return { ...block, props: { ...block.props, language: normalizedLanguage } };
}

function syncPreCollapsed(preElement: HTMLPreElement, collapsed: boolean) {
  if (collapsed) {
    preElement.dataset.collapsed = 'true';
    return;
  }
  delete preElement.dataset.collapsed;
}

const baseCodeBlockSpec = createCodeBlockSpec({
  ...codeBlockOptions,
  createHighlighter: getCodeBlockHighlighter,
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
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'default' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'default' },
    print: { support: 'custom' },
  },
  markdownImport: {
    restore: (block) => normalizeImportedCodeBlockLanguage(block),
  },
  selection: {
    inspect: (_block, context) => ({ selected: context.selected, text: context.selectedText }),
  },
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
