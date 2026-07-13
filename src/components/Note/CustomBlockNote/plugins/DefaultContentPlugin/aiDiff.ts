import { transformRichTextAiDiffProtocol } from '../runtime/aiDiff/protocol';
import {
  buildAiEditJsonUnits,
  DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
  tokenizeForAiEdit,
} from '../runtime/aiDiff/wordDiff';
import type {
  NoteAiDiffAction,
  NoteBlockAiDiff,
  NoteInlineAiDiff,
  NotePluginRegistry,
} from '../types';

type TextInlineContent = { type: 'text'; text: string; styles?: Record<string, string> };
type NoteInlineContentLike = TextInlineContent | Record<string, unknown>;
type AiGeneratedInline =
  | {
      type: 'AI-Create' | 'AI-Delete';
      text: string;
      styles?: Record<string, string>;
      normalizedKey?: string;
    }
  | {
      type: 'AI-Edit';
      old_text?: string;
      new_text?: string;
      text_old?: string;
      text_new?: string;
      styles?: Record<string, string>;
      normalizedKey?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringStyles(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    })
  );
}

function textInline(text: string, styles: Record<string, string> = {}): TextInlineContent {
  return { type: 'text', text, styles };
}

function textChange(
  origin: string,
  replace: string,
  styles: Record<string, string> = {}
): Record<string, unknown>[] {
  if (!origin && !replace) return [];
  if (origin === replace) return origin ? [textInline(origin, styles)] : [];
  return [{ type: 'AI-Edit', old_text: origin, new_text: replace, styles }];
}

export const plainTextInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => false,
  isVisible: (inline) => stringValue(inline.text).trim() !== '',
  apply: () => undefined,
  normalizeGenerated(inline) {
    if (typeof inline.text !== 'string') return null;
    return [textInline(inline.text, stringStyles(inline.styles))];
  },
  generatedText: {
    read(inline) {
      if (typeof inline.text !== 'string') return undefined;
      return { text: inline.text, styles: stringStyles(inline.styles) };
    },
    create: ({ text, styles }) => textInline(text, styles),
  },
  protocol: {
    kind: 'text',
    normalize: (inline) => textInline(stringValue(inline.text), stringStyles(inline.styles)),
    visibleText: (inline) => stringValue(inline.text),
    plain: (inline) => {
      const text = stringValue(inline.text);
      return text ? [textInline(text, stringStyles(inline.styles))] : [];
    },
    create: (inline) => {
      const text = stringValue(inline.text);
      return text ? [{ type: 'AI-Create', text, styles: stringStyles(inline.styles) }] : [];
    },
    delete: (inline) => {
      const text = stringValue(inline.text);
      return text ? [{ type: 'AI-Delete', text, styles: stringStyles(inline.styles) }] : [];
    },
    edit: (origin, replace) =>
      textChange(stringValue(origin.text), stringValue(replace.text), {
        ...stringStyles(origin.styles),
        ...stringStyles(replace.styles),
      }),
    editText: (origin, replace) => textChange(origin, replace),
  },
};

function normalizeLinkTextContent(content: unknown): TextInlineContent[] | null {
  if (!Array.isArray(content)) return null;
  const normalized: TextInlineContent[] = [];
  for (const child of content) {
    if (!isRecord(child) || child.type !== 'text' || typeof child.text !== 'string') return null;
    if (!child.text) continue;
    normalized.push(textInline(child.text, stringStyles(child.styles)));
  }
  return normalized;
}

function normalizeGeneratedLinkContent(
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

function normalizedLink(inline: Record<string, unknown>) {
  return {
    type: 'link',
    href: stringValue(inline.href),
    content: normalizeLinkTextContent(inline.content) ?? [],
  };
}

export const plainLinkInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => false,
  isVisible: () => true,
  apply: () => undefined,
  normalizeGenerated(inline, context) {
    const content = normalizeGeneratedLinkContent(inline.content, context);
    if (!content) return null;
    const href = stringValue(inline.href);
    const text = content.map((child) => context.text.read(child)?.text ?? '').join('');
    const type = stringValue(inline.aiDiffType);
    const key = stringValue(inline.aiDiffKey) || context.key;
    if (type === 'create' || type === 'delete') {
      return [
        {
          type: type === 'create' ? 'ai-link-add' : 'ai-link-delete',
          props: { text, href, content: JSON.stringify(content), key },
        },
      ];
    }
    return [{ type: inline.type, href, content }];
  },
  protocol: {
    kind: 'atom',
    normalize: normalizedLink,
    visibleText: (inline) =>
      (normalizeLinkTextContent(inline.content) ?? []).map((child) => child.text).join(''),
    plain: (inline) => [normalizedLink(inline)],
    create: (inline) => [{ ...normalizedLink(inline), aiDiffType: 'create' }],
    delete: (inline) => [{ ...normalizedLink(inline), aiDiffType: 'delete' }],
    edit: () => null,
  },
};

function isAiGeneratedInline(value: unknown): value is AiGeneratedInline {
  if (!isRecord(value)) return false;
  if (value.type === 'AI-Create' || value.type === 'AI-Delete') {
    return typeof value.text === 'string';
  }
  return value.type === 'AI-Edit';
}

function normalizeGeneratedInlineNode(
  inline: Record<string, unknown>,
  key: string,
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] | null {
  const owner = registry.inlinePlugins.get(stringValue(inline.type));
  const normalizeGenerated = owner?.aiDiff.normalizeGenerated;
  const text = registry.aiDiffText;
  if (!normalizeGenerated || !text) return null;
  return normalizeGenerated(inline, {
    key,
    text,
    normalizeInline: (child, childKey) => normalizeGeneratedInlineNode(child, childKey, registry),
  });
}

function mergeAdjacentGeneratedText(
  nodes: readonly Record<string, unknown>[],
  registry: NotePluginRegistry
): Record<string, unknown>[] {
  const text = registry.aiDiffText;
  if (!text) return [...nodes];
  const merged: Record<string, unknown>[] = [];
  for (const node of nodes) {
    const previous = merged[merged.length - 1];
    const currentText = text.read(node);
    const previousText = previous ? text.read(previous) : undefined;
    if (currentText && previousText) {
      merged[merged.length - 1] = text.create({
        text: previousText.text + currentText.text,
        styles: previousText.styles,
      });
    } else {
      merged.push(node);
    }
  }
  return merged;
}

function mergeGeneratedEditChains(
  nodes: readonly Record<string, unknown>[],
  registry: NotePluginRegistry
): Record<string, unknown>[] {
  const options = {
    ...DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
    maxGapChars: 4,
    maxGapTokens: 2,
    breakOnSentenceEnd: false,
    breakOnClauseBoundary: false,
  };
  const merged: Record<string, unknown>[] = [];
  let index = 0;
  while (index < nodes.length) {
    const current = nodes[index];
    if (!isAiGeneratedInline(current) || current.type !== 'AI-Edit') {
      merged.push(current);
      index += 1;
      continue;
    }

    let origin = stringValue(current.old_text) || stringValue(current.text_old);
    let replace = stringValue(current.new_text) || stringValue(current.text_new);
    const styles = stringStyles(current.styles);
    let cursor = index + 1;
    while (cursor + 1 < nodes.length) {
      const bridge = registry.aiDiffText?.read(nodes[cursor])?.text;
      const next = nodes[cursor + 1];
      if (!bridge || !isAiGeneratedInline(next) || next.type !== 'AI-Edit') break;
      if (options.breakOnNewline && bridge.includes('\n')) break;
      if (bridge.length > options.maxGapChars) break;
      if (tokenizeForAiEdit(bridge).length > options.maxGapTokens) break;
      const nextOrigin =
        origin + bridge + (stringValue(next.old_text) || stringValue(next.text_old));
      const nextReplace =
        replace + bridge + (stringValue(next.new_text) || stringValue(next.text_new));
      const nextLength = Math.max(nextOrigin.length, nextReplace.length);
      if (nextLength > options.maxMergedLength) break;
      origin = nextOrigin;
      replace = nextReplace;
      cursor += 2;
    }
    merged.push({
      type: 'AI-Edit',
      old_text: origin,
      new_text: replace,
      styles,
      normalizedKey: current.normalizedKey,
    });
    index = cursor;
  }
  return mergeAdjacentGeneratedText(merged, registry);
}

function normalizeGeneratedInlineContent(
  content: unknown,
  keyPrefix: string,
  registry: NotePluginRegistry
): Record<string, unknown>[] | null {
  if (content == null) return [];
  if (!Array.isArray(content) || !registry.aiDiffText) return null;
  const normalized: Record<string, unknown>[] = [];
  for (let index = 0; index < content.length; index += 1) {
    const item = content[index];
    if (!isRecord(item)) return null;
    const key = `${keyPrefix}:c${index + 1}`;
    if (!isAiGeneratedInline(item)) {
      const nodes = normalizeGeneratedInlineNode(item, key, registry);
      if (!nodes) return null;
      normalized.push(...nodes);
      continue;
    }
    if (item.type !== 'AI-Edit') {
      normalized.push({ ...item, normalizedKey: key });
      continue;
    }
    const edit = item as Extract<AiGeneratedInline, { type: 'AI-Edit' }>;
    const origin = stringValue(edit.old_text) || stringValue(edit.text_old);
    const replace = stringValue(edit.new_text) || stringValue(edit.text_new);
    const units = buildAiEditJsonUnits(origin, replace);
    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
      const unit = units[unitIndex];
      if (unit.type === 'plain') {
        if (unit.text) {
          normalized.push(
            registry.aiDiffText.create({ text: unit.text, styles: stringStyles(item.styles) })
          );
        }
      } else {
        normalized.push({
          type: 'AI-Edit',
          old_text: unit.origin,
          new_text: unit.replace,
          styles: stringStyles(item.styles),
          normalizedKey: `${key}.${unitIndex + 1}`,
        });
      }
    }
  }
  return mergeGeneratedEditChains(mergeAdjacentGeneratedText(normalized, registry), registry);
}

function generatedInlineToEditorContent(content: unknown): NoteInlineContentLike[] | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;
  const nodes: NoteInlineContentLike[] = [];
  for (const item of content) {
    if (!isRecord(item)) return null;
    if (!isAiGeneratedInline(item)) {
      nodes.push(item);
      continue;
    }
    const key = stringValue(item.normalizedKey);
    if (!key) return null;
    if (item.type === 'AI-Create' || item.type === 'AI-Delete') {
      nodes.push({
        type: item.type === 'AI-Create' ? 'ai-add' : 'ai-delete',
        props: { text: stringValue(item.text), key },
      });
      continue;
    }
    const edit = item as Extract<AiGeneratedInline, { type: 'AI-Edit' }>;
    const origin = stringValue(edit.old_text) || stringValue(edit.text_old);
    const replace = stringValue(edit.new_text) || stringValue(edit.text_new);
    if (origin || replace) {
      nodes.push({
        type: 'ai-diff',
        props: { origin, replace, key, granularity: 'word' },
      });
    }
  }
  return mergeAdjacentText(nodes);
}

function typeOf(value: unknown): string {
  return isRecord(value) ? stringValue(value.type) : '';
}

function textOf(value: unknown): string {
  return isRecord(value) ? stringValue(value.text) : '';
}

function mergeAdjacentText(nodes: readonly NoteInlineContentLike[]): NoteInlineContentLike[] {
  const merged: NoteInlineContentLike[] = [];
  for (const node of nodes) {
    const previous = merged[merged.length - 1];
    if (typeOf(previous) === 'text' && typeOf(node) === 'text') {
      merged[merged.length - 1] = textInline(textOf(previous) + textOf(node));
    } else {
      merged.push(node);
    }
  }
  return merged;
}

function applyAllInlineActions(
  content: unknown,
  action: NoteAiDiffAction,
  registry: NotePluginRegistry
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  let changed = false;
  const result: NoteInlineContentLike[] = [];
  for (const node of content) {
    if (!isRecord(node)) {
      result.push(node as NoteInlineContentLike);
      continue;
    }
    const replacement = registry.inlinePlugins.get(typeOf(node))?.aiDiff.apply(node, action);
    if (replacement !== undefined) {
      changed = true;
      result.push(...replacement);
    } else {
      result.push(node);
    }
  }
  return changed ? mergeAdjacentText(result) : null;
}

function isInlineContentEmpty(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return true;
  return content.every((node) => typeOf(node) === 'text' && textOf(node).trim() === '');
}

export const richTextBlockAiDiff: NoteBlockAiDiff = {
  normalizeProtocol({ props, content, aiContent }, registry) {
    return { props, content: transformRichTextAiDiffProtocol(content, aiContent, registry) };
  },
  normalizeGenerated({ props, content, keyPrefix }, registry) {
    const normalized = normalizeGeneratedInlineContent(content, keyPrefix, registry);
    if (!normalized) return null;
    const mapped = generatedInlineToEditorContent(normalized);
    return mapped ? { props, content: mapped } : null;
  },
  applyAll(block, action, registry) {
    const content = applyAllInlineActions(block.content, action, registry);
    if (!content) return { kind: 'none' };
    return { kind: 'update', content, removeWhenChildless: isInlineContentEmpty(content) };
  },
};

export const atomicPropsBlockAiDiff: NoteBlockAiDiff = {
  normalizeProtocol({ props }) {
    return { props, content: [] };
  },
  normalizeGenerated({ props, content }) {
    return content == null || (Array.isArray(content) && content.length === 0) ? { props } : null;
  },
  applyAll() {
    return { kind: 'none' };
  },
};
