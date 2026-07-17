import type { NoteBlockPlugin, NoteInlinePlugin, NotePluginBundle } from '../../registry/types';
import { inlineMathAiDiff, mathBlockAiDiff } from './aiDiff';
import { inlineMathContentSpec } from './InlineMath';
import { createInlineMathDollarExtension } from './InlineMath/inlineMathDollarExtension';
import { inlineMathMarkdownImport, mathBlockMarkdownImport } from './markdownImport';
import { createMathBlockSpec } from './MathBlock';
import { createMathSlashMenuItem } from './slashMenuItem';

const mathBlockPlugin = {
  kind: 'block',
  id: 'latex.block.math',
  type: 'math',
  contentModel: 'none',
  spec: createMathBlockSpec(),
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'custom' },
    print: { support: 'custom' },
  },
  print: {
    styles: [
      `.note-print-body .bn-block-content[data-content-type='math'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}
.note-print-body .bn-editor .katex-display,
.note-print-title .katex-display {
  margin: 0.6em 0 !important;
}`,
    ],
  },
  slashMenu: ({ editor }) => [createMathSlashMenuItem(editor)],
  plainText: {
    project: (block) => {
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  markdownImport: mathBlockMarkdownImport,
  markdownExport: {
    project: (block) => block,
    renderMarkdown(block) {
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      const expression = typeof props.expression === 'string' ? props.expression.trim() : '';
      return `$$\n${expression}\n$$`;
    },
  },
  aiDiff: mathBlockAiDiff,
} satisfies NoteBlockPlugin;

const inlineMathPlugin = {
  kind: 'inline',
  id: 'latex.inline.inlineMath',
  type: 'inlineMath',
  spec: inlineMathContentSpec,
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    plainText: { support: 'custom' },
    print: { support: 'default' },
  },
  extensions: ({ registry }) => [createInlineMathDollarExtension(registry)()],
  plainText: {
    project: (inline) => {
      const props =
        typeof inline.props === 'object' && inline.props !== null
          ? (inline.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  markdownImport: inlineMathMarkdownImport,
  markdownExport: { project: (inline) => inline },
  aiDiff: inlineMathAiDiff,
} satisfies NoteInlinePlugin;

export const latexPlugin = {
  kind: 'bundle',
  id: 'latex',
  children: [mathBlockPlugin, inlineMathPlugin],
} satisfies NotePluginBundle;
