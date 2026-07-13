import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type BlockSpecs,
  type InlineContentConfig,
  type InlineContentSpec,
} from '@blocknote/core';
import { Image as ImageIcon } from 'lucide-react';

import { projectInlinePlainText } from '../projection';
import { shouldFoldAiDiffInlineContent } from '../runtime/aiDiff/presence';
import type {
  NoteBlockAiDiff,
  NoteBlockPlugin,
  NoteCapabilityDeclaration,
  NoteContentCapabilityDeclarations,
  NoteContentComments,
  NoteInlinePlugin,
  NotePluginBundle,
  NotePrintContribution,
} from '../types';
import {
  atomicPropsBlockAiDiff,
  plainLinkInlineAiDiff,
  plainTextInlineAiDiff,
  richTextBlockAiDiff,
} from './aiDiff';

const DEFAULT_CAPABILITY: NoteCapabilityDeclaration = { support: 'default' };
const UNSUPPORTED_AI_DIFF: NoteCapabilityDeclaration = {
  support: 'unsupported',
  reason: '当前内容类型不承担 AI Diff 语义',
};
function richTextCapabilities(): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff: { support: 'inherited' },
    projection: { support: 'inherited' },
    print: DEFAULT_CAPABILITY,
  };
}

function atomicCapabilities(
  aiDiff: NoteCapabilityDeclaration = UNSUPPORTED_AI_DIFF
): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff,
    projection: { support: 'inherited' },
    print: DEFAULT_CAPABILITY,
  };
}

function createDefaultBlockPlugin(
  type: string,
  capabilities: NoteContentCapabilityDeclarations,
  options: {
    outline?: boolean;
    aiDiff?: NoteBlockPlugin['aiDiff'];
    comments?: NoteContentComments;
    contentModel?: NoteBlockPlugin['contentModel'];
    defaultInsertion?: boolean;
    inlineMathDollar?: boolean;
    print?: NotePrintContribution;
    sideMenu?: NoteBlockPlugin['sideMenu'];
  } = {}
) {
  const spec = (defaultBlockSpecs as BlockSpecs)[type];
  if (!spec) {
    throw new Error(`BlockNote 默认 block spec 不存在：${type}`);
  }
  return {
    kind: 'block',
    id: `default.block.${type}`,
    type,
    spec,
    contentModel: options.contentModel ?? 'inline',
    ...(options.defaultInsertion
      ? { insertion: { default: true, createEmpty: () => ({ type }) } }
      : {}),
    ...(options.inlineMathDollar ? { inputRules: { inlineMathDollar: true } } : {}),
    capabilities,
    ...(options.aiDiff ? { aiDiff: options.aiDiff } : {}),
    ...(options.print ? { print: options.print } : {}),
    ...(options.sideMenu ? { sideMenu: options.sideMenu } : {}),
    comments: options.comments ?? { documentThreads: 'unsupported' },
    projection: {
      plainText: (block, registry) => projectInlinePlainText(block.content, registry),
      ...(options.outline
        ? {
            outlineLevel: (block: Record<string, unknown>) => {
              const props =
                typeof block.props === 'object' && block.props !== null
                  ? (block.props as Record<string, unknown>)
                  : {};
              const level = Number(props.level ?? 1);
              return Number.isFinite(level) && level > 0 ? level : 1;
            },
          }
        : {}),
    },
  } satisfies NoteBlockPlugin;
}

function createDefaultInlinePlugin(type: 'text' | 'link') {
  const spec = defaultInlineContentSpecs[type] as InlineContentSpec<InlineContentConfig>;
  return {
    kind: 'inline',
    id: `default.inline.${type}`,
    type,
    spec,
    capabilities: {
      markdownImport: DEFAULT_CAPABILITY,
      markdownExport: DEFAULT_CAPABILITY,
      aiDiff: { support: 'inherited' },
      projection: { support: 'inherited' },
      print: DEFAULT_CAPABILITY,
    },
    projection: {
      plainText: (inline, registry) => {
        if (type === 'text') {
          return typeof inline.text === 'string' ? inline.text : '';
        }
        return projectInlinePlainText(inline.content, registry);
      },
    },
    aiDiff: type === 'text' ? plainTextInlineAiDiff : plainLinkInlineAiDiff,
    comments: { documentThreads: 'range' },
  } satisfies NoteInlinePlugin;
}

const richTextBlockTypes = [
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
] as const;

const passThroughAtomicBlockTypes = ['audio', 'divider', 'file', 'image', 'video'] as const;

const headingPrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='heading'],
.note-print-title .bn-block-content[data-content-type='heading'] {
  break-after: avoid-page;
  page-break-after: avoid;
}`,
  ],
};

const quotePrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='quote'] {
  break-after: avoid-page;
  page-break-after: avoid;
}`,
  ],
};

const atomicMediaPrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='image'],
.note-print-body .bn-block-content[data-content-type='video'],
.note-print-body .bn-block-content[data-content-type='audio'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}`,
  ],
};

const toggleListItemAiDiff = {
  ...richTextBlockAiDiff,
  getFoldedChildrenAnchorId(block, mode, registry) {
    if (!Array.isArray(block.children) || block.children.length === 0) return '';
    const first = block.children[0];
    if (typeof first !== 'object' || first === null || typeof first.id !== 'string') return '';
    for (const child of block.children) {
      if (typeof child !== 'object' || child === null) return '';
      const record = child as Record<string, unknown>;
      if (typeof record.id !== 'string') return '';
      if (!shouldFoldAiDiffInlineContent(record.content, mode, registry)) return '';
    }
    return first.id;
  },
} satisfies NoteBlockAiDiff;

export const defaultContentPlugin = {
  kind: 'bundle',
  id: 'default-content',
  children: [
    createDefaultInlinePlugin('text'),
    createDefaultInlinePlugin('link'),
    ...richTextBlockTypes.map((type) =>
      createDefaultBlockPlugin(
        type,
        {
          ...richTextCapabilities(),
          ...(type === 'heading' || type === 'quote'
            ? { print: { support: 'custom' as const } }
            : {}),
        },
        {
          outline: type === 'heading',
          aiDiff: type === 'toggleListItem' ? toggleListItemAiDiff : richTextBlockAiDiff,
          comments: { documentThreads: 'range' },
          defaultInsertion: type === 'paragraph',
          inlineMathDollar:
            type === 'paragraph' ||
            type === 'bulletListItem' ||
            type === 'numberedListItem' ||
            type === 'checkListItem',
          ...(type === 'heading' ? { print: headingPrint } : {}),
          ...(type === 'quote' ? { print: quotePrint } : {}),
          ...(type === 'heading'
            ? {
                sideMenu: {
                  inspect(block: Record<string, unknown>) {
                    const props =
                      typeof block.props === 'object' && block.props !== null
                        ? (block.props as Record<string, unknown>)
                        : {};
                    return { attributes: { level: String(props.level ?? 1) } };
                  },
                },
              }
            : {}),
        }
      )
    ),
    ...passThroughAtomicBlockTypes.map((type) =>
      createDefaultBlockPlugin(
        type,
        {
          ...atomicCapabilities({ support: 'inherited' }),
          ...(type === 'audio' || type === 'image' || type === 'video'
            ? { print: { support: 'custom' as const } }
            : {}),
        },
        {
          aiDiff: atomicPropsBlockAiDiff,
          contentModel: 'none',
          ...(type === 'audio' || type === 'image' || type === 'video'
            ? { print: atomicMediaPrint }
            : {}),
          ...(type === 'image' ? { sideMenu: { icon: ImageIcon } } : {}),
        }
      )
    ),
  ],
} satisfies NotePluginBundle;
