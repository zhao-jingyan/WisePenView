import { atomicAiDiffMarkdownExport } from '../AIDiffPlugin/ownerExport';
import { atomicInlineAiDiff } from '../AIDiffPlugin/ownerPresence';
import { mathBlockAiDiff } from '../AIDiffPlugin/patch';
import type { NoteBlockPlugin, NoteInlinePlugin, NotePluginBundle } from '../types';
import { inlineMathContentSpec } from './InlineMath';
import { inlineMathDollarExtension } from './InlineMath/inlineMathDollarExtension';
import { createMathBlockSpec } from './MathBlock';
import { inlineMathMarkdownImport, mathBlockMarkdownImport } from './markdownImport';
import { createMathSlashMenuItem } from './slashMenuItem';

export const mathBlockPlugin = {
  kind: 'block',
  id: 'latex.block.math',
  type: 'math',
  spec: createMathBlockSpec(),
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    comments: { support: 'custom' },
    projection: { support: 'custom' },
    print: { support: 'custom' },
  },
  slashMenu: ({ editor }) => [createMathSlashMenuItem(editor)],
  projection: {
    plainText: (block) => {
      const props =
        typeof block.props === 'object' && block.props !== null
          ? (block.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  markdownImport: mathBlockMarkdownImport,
  markdownExport: {
    ...atomicAiDiffMarkdownExport,
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

export const inlineMathPlugin = {
  kind: 'inline',
  id: 'latex.inline.inlineMath',
  type: 'inlineMath',
  spec: inlineMathContentSpec,
  capabilities: {
    markdownImport: { support: 'custom' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    comments: { support: 'custom' },
    projection: { support: 'custom' },
    print: { support: 'custom' },
  },
  extensions: () => [inlineMathDollarExtension()],
  projection: {
    plainText: (inline) => {
      const props =
        typeof inline.props === 'object' && inline.props !== null
          ? (inline.props as Record<string, unknown>)
          : {};
      return typeof props.expression === 'string' ? props.expression : '';
    },
  },
  markdownImport: inlineMathMarkdownImport,
  markdownExport: atomicAiDiffMarkdownExport,
  aiDiff: atomicInlineAiDiff,
  comments: { canCreateDocumentThread: true },
} satisfies NoteInlinePlugin;

export const latexPlugin = {
  kind: 'bundle',
  id: 'latex',
  children: [mathBlockPlugin, inlineMathPlugin],
} satisfies NotePluginBundle;
