import type { NoteInlinePlugin, NotePluginBundle } from '../types';
import { createAiChangeInlineAiDiff } from './aiDiff';
import {
  aiAddInlineContentSpec,
  aiDeleteInlineContentSpec,
  aiDiffInlineContentSpec,
  aiLinkAddInlineContentSpec,
  aiLinkDeleteInlineContentSpec,
} from './inlineContentSpecs';
import { createAiDiffSyntaxMarkdownExport } from './markdownExport';

function createAiChangeInlinePlugin(params: {
  id: string;
  type: string;
  spec: NoteInlinePlugin['spec'];
  plainText: (props: Record<string, unknown>) => string;
}): NoteInlinePlugin {
  return {
    kind: 'inline',
    id: params.id,
    type: params.type,
    spec: params.spec,
    capabilities: {
      markdownImport: { support: 'unsupported', reason: 'AI Diff 语法节点不从 Markdown 导入' },
      markdownExport: { support: 'custom' },
      aiDiff: { support: 'custom' },
      projection: { support: 'custom' },
      print: { support: 'custom' },
    },
    print: {
      styles: [
        `.note-print-body [class*='aiActionsRoot'],
.note-print-body [class*='aiActionsAnchor'],
.note-print-body [class*='aiDiffInlineStrategyHidden'] {
  display: none !important;
  visibility: hidden !important;
  max-width: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
}`,
      ],
    },
    projection: {
      plainText: (inline) => {
        const props =
          typeof inline.props === 'object' && inline.props !== null
            ? (inline.props as Record<string, unknown>)
            : {};
        return params.plainText(props);
      },
    },
    markdownExport: createAiDiffSyntaxMarkdownExport(params.type),
    aiDiff: createAiChangeInlineAiDiff(params.type),
    comments: { documentThreads: 'unsupported' },
  };
}

export const aiChangePlugin = {
  kind: 'bundle',
  id: 'ai-change',
  children: [
    createAiChangeInlinePlugin({
      id: 'ai-change.inline.diff',
      type: 'ai-diff',
      spec: aiDiffInlineContentSpec,
      plainText: (props) =>
        typeof props.replace === 'string'
          ? props.replace
          : typeof props.origin === 'string'
            ? props.origin
            : '',
    }),
    createAiChangeInlinePlugin({
      id: 'ai-change.inline.add',
      type: 'ai-add',
      spec: aiAddInlineContentSpec,
      plainText: (props) => (typeof props.text === 'string' ? props.text : ''),
    }),
    createAiChangeInlinePlugin({
      id: 'ai-change.inline.delete',
      type: 'ai-delete',
      spec: aiDeleteInlineContentSpec,
      plainText: (props) => (typeof props.text === 'string' ? props.text : ''),
    }),
    createAiChangeInlinePlugin({
      id: 'ai-change.inline.link-add',
      type: 'ai-link-add',
      spec: aiLinkAddInlineContentSpec,
      plainText: (props) => (typeof props.text === 'string' ? props.text : ''),
    }),
    createAiChangeInlinePlugin({
      id: 'ai-change.inline.link-delete',
      type: 'ai-link-delete',
      spec: aiLinkDeleteInlineContentSpec,
      plainText: (props) => (typeof props.text === 'string' ? props.text : ''),
    }),
  ],
} satisfies NotePluginBundle;
