import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import type { NoteInlineAiDiff } from '../types';
import { applyAiDiffActionToProps, hasAtomicAiDiff, resolveAiInlineReplacement } from './patch';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readProps(content: Record<string, unknown>): Record<string, unknown> {
  const props = content.props;
  return isRecord(props) ? props : content;
}

function stringProp(content: Record<string, unknown>, key: string): string {
  const value = readProps(content)[key];
  return typeof value === 'string' ? value : '';
}

function stringStyles(content: Record<string, unknown>): Record<string, string> {
  if (!isRecord(content.styles)) return {};
  return Object.fromEntries(
    Object.entries(content.styles).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    })
  );
}

function normalizeLinkContent(
  content: unknown,
  context: Parameters<NonNullable<NoteInlineAiDiff['normalizeGenerated']>>[1]
): Record<string, unknown>[] | null {
  if (!Array.isArray(content)) return null;
  const normalized: Record<string, unknown>[] = [];
  for (let index = 0; index < content.length; index += 1) {
    const child = content[index];
    if (!isRecord(child)) return null;
    const nodes = context.normalizeInline(child, `${context.key}:link:${index}`);
    if (!nodes) return null;
    for (const node of nodes) {
      const text = context.text.read(node);
      if (!text) return null;
      normalized.push(context.text.create(text));
    }
  }
  return normalized;
}

export const plainTextInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => false,
  isVisible: (inline) => typeof inline.text === 'string' && inline.text.trim() !== '',
  apply: () => undefined,
  normalizeGenerated(inline) {
    if (typeof inline.text !== 'string') return null;
    return [
      {
        type: inline.type,
        text: inline.text,
        styles: stringStyles(inline),
      },
    ];
  },
  generatedText: {
    read(inline) {
      if (typeof inline.text !== 'string') return undefined;
      return { text: inline.text, styles: stringStyles(inline) };
    },
    create: ({ text, styles }) => ({ type: 'text', text, styles }),
  },
};

export const plainLinkInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => false,
  isVisible: () => true,
  apply: () => undefined,
  normalizeGenerated(inline, context) {
    const content = normalizeLinkContent(inline.content, context);
    if (!content) return null;
    const href = typeof inline.href === 'string' ? inline.href : '';
    const text = content.map((child) => context.text.read(child)?.text ?? '').join('');
    const aiDiffType = typeof inline.aiDiffType === 'string' ? inline.aiDiffType : '';
    const key =
      typeof inline.aiDiffKey === 'string' && inline.aiDiffKey ? inline.aiDiffKey : context.key;
    if (aiDiffType === 'create' || aiDiffType === 'delete') {
      return [
        {
          type: aiDiffType === 'create' ? 'ai-link-add' : 'ai-link-delete',
          props: { text, href, content: JSON.stringify(content), key },
        },
      ];
    }
    return [{ type: inline.type, href, content }];
  },
};

export const atomicInlineAiDiff: NoteInlineAiDiff = {
  isPresent: hasAtomicAiDiff,
  isVisible(inline, mode) {
    const expression = stringProp(inline, 'expression');
    const aiDiffType = stringProp(inline, 'aiDiffType');
    const origin = stringProp(inline, 'aiDiffOrigin');
    const replace = stringProp(inline, 'aiDiffReplace');
    if (aiDiffType === 'edit') {
      if (mode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
      if (mode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
      return origin !== '' || replace !== '';
    }
    if (aiDiffType === 'create') {
      return mode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY && replace !== '';
    }
    if (aiDiffType === 'delete') {
      return mode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY && origin !== '';
    }
    return expression !== '';
  },
  apply(inline, action) {
    const result = applyAiDiffActionToProps(readProps(inline), action);
    if (result.kind === 'none') return undefined;
    if (result.kind === 'remove') return [];
    return [{ ...inline, props: result.props }];
  },
  normalizeGenerated(inline, context) {
    const props = readProps(inline);
    const aiDiffType = stringProp(inline, 'aiDiffType');
    const origin = stringProp(inline, 'aiDiffOrigin');
    const replace = stringProp(inline, 'aiDiffReplace');
    const expression =
      stringProp(inline, 'expression') ||
      (aiDiffType === 'create' ? replace : aiDiffType === 'delete' ? origin : replace || origin);
    return [
      {
        type: inline.type,
        props: {
          ...props,
          expression,
          autoOpenEdit: Boolean(props.autoOpenEdit),
          aiDiffType,
          aiDiffKey: stringProp(inline, 'aiDiffKey') || context.key,
          aiDiffOrigin: origin,
          aiDiffReplace: replace,
        },
      },
    ];
  },
};

export function createSyntaxInlineAiDiff(type: string): NoteInlineAiDiff {
  return {
    isPresent: () => true,
    isVisible(inline, mode) {
      const action = mode === AI_DIFF_DISPLAY_MODE.NEW_ONLY ? 'accept' : 'discard';
      if (mode === AI_DIFF_DISPLAY_MODE.COMPARE) {
        return type === 'ai-diff'
          ? Boolean(stringProp(inline, 'origin') || stringProp(inline, 'replace'))
          : Boolean(stringProp(inline, 'text'));
      }
      return resolveAiInlineReplacement(type, readProps(inline), action).length > 0;
    },
    apply(inline, action) {
      return resolveAiInlineReplacement(type, readProps(inline), action) as Record<
        string,
        unknown
      >[];
    },
    normalizeGenerated: (inline) => [inline],
  };
}
