import type { NoteAiDiffAction, NoteBlockAiDiff, NotePluginRegistry } from '../types';
import {
  buildAiEditJsonUnits,
  DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
  tokenizeForAiEdit,
} from './wordDiff.ts';

type TextInlineContent = { type: 'text'; text: string; styles?: Record<string, string> };
type AiDiffInlineContent = {
  type: 'ai-diff';
  props: { origin: string; replace: string; key: string };
};
type AiAddInlineContent = { type: 'ai-add'; props: { text: string; key: string } };
type AiDeleteInlineContent = { type: 'ai-delete'; props: { text: string; key: string } };
type AiLinkAddInlineContent = {
  type: 'ai-link-add';
  props: { text: string; href: string; content: string; key: string };
};
type AiLinkDeleteInlineContent = {
  type: 'ai-link-delete';
  props: { text: string; href: string; content: string; key: string };
};
type LinkInlineContent = {
  type: 'link';
  href: string;
  content: TextInlineContent[];
};
export type NoteInlineContentLike =
  | TextInlineContent
  | AiDiffInlineContent
  | AiAddInlineContent
  | AiDeleteInlineContent
  | AiLinkAddInlineContent
  | AiLinkDeleteInlineContent
  | LinkInlineContent
  | Record<string, unknown>;

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

type AiDiffPropsActionResult =
  { kind: 'none' } | { kind: 'remove' } | { kind: 'update'; props: Record<string, unknown> };

const AI_DIFF_INLINE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

const AI_DIFF_PROP_TYPES = new Set(['edit', 'create', 'delete']);

export function hasAtomicAiDiff(content: Record<string, unknown>): boolean {
  const props = isRecord(content.props) ? content.props : content;
  return AI_DIFF_PROP_TYPES.has(getPropString(props, 'aiDiffType'));
}

function toTextInline(text: string): TextInlineContent {
  return { type: 'text', text, styles: {} };
}

function toLinkInline(
  text: string,
  href: string,
  content: TextInlineContent[] = text ? [toTextInline(text)] : []
): LinkInlineContent {
  return {
    type: 'link',
    href,
    content,
  };
}

export type AiGeneratedBlock = {
  id: string;
  type: string;
  props?: Record<string, JsonValue>;
  content?: unknown;
  children?: unknown;
};

type AiGeneratedInlineCreate = {
  type: 'AI-Create';
  text: string;
  styles?: Record<string, string>;
  normalizedKey?: string;
};
type AiGeneratedInlineDelete = {
  type: 'AI-Delete';
  text: string;
  styles?: Record<string, string>;
  normalizedKey?: string;
};
type AiGeneratedInlineEdit = {
  type: 'AI-Edit';
  old_text?: string;
  new_text?: string;
  text_old?: string;
  text_new?: string;
  styles?: Record<string, string>;
  normalizedKey?: string;
};

function toStringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toJsonProps(v: unknown): Record<string, JsonValue> {
  if (!isRecord(v)) return {};
  return v as Record<string, JsonValue>;
}

function isAiGeneratedInline(
  v: unknown
): v is AiGeneratedInlineCreate | AiGeneratedInlineDelete | AiGeneratedInlineEdit {
  if (!isRecord(v)) return false;
  const t = v['type'];
  if (t === 'AI-Create') return typeof v['text'] === 'string';
  if (t === 'AI-Delete') return typeof v['text'] === 'string';
  if (t === 'AI-Edit') return true;
  return false;
}

function normalizeGeneratedInlineNode(
  inline: Record<string, unknown>,
  key: string,
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] | null {
  const type = toStringOrEmpty(inline.type);
  const owner = registry.inlinePlugins.get(type);
  const normalizeGenerated = owner?.aiDiff.normalizeGenerated;
  const text = registry.aiDiffText;
  if (!normalizeGenerated || !text) return null;
  return normalizeGenerated(inline, {
    key,
    text,
    normalizeInline: (child, childKey) => normalizeGeneratedInlineNode(child, childKey, registry),
  });
}

function resolveAiGeneratedEditText(item: AiGeneratedInlineEdit): {
  origin: string;
  replace: string;
} {
  return {
    origin: toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old),
    replace: toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new),
  };
}

function normalizeAiGeneratedInlineContent(
  content: unknown,
  keyPrefix: string,
  registry: NotePluginRegistry
): Record<string, unknown>[] | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;

  const text = registry.aiDiffText;
  if (!text) return null;
  const out: Record<string, unknown>[] = [];

  for (let index = 0; index < content.length; index += 1) {
    const item = content[index];
    if (!isRecord(item)) return null;
    const key = `${keyPrefix}:c${index + 1}`;
    if (!isAiGeneratedInline(item)) {
      const normalized = normalizeGeneratedInlineNode(item, key, registry);
      if (!normalized) return null;
      out.push(...normalized);
      continue;
    }
    if (item.type !== 'AI-Edit') {
      out.push({ ...item, normalizedKey: key });
      continue;
    }

    const origin = toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old);
    const replace = toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new);
    const units = buildAiEditJsonUnits(origin, replace);
    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
      const unit = units[unitIndex];
      if (unit.type === 'plain') {
        if (unit.text.length === 0) continue;
        out.push(
          text.create({
            text: unit.text,
            styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
          })
        );
      } else {
        out.push({
          type: 'AI-Edit',
          old_text: unit.origin,
          new_text: unit.replace,
          styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
          normalizedKey: `${key}.${unitIndex + 1}`,
        });
      }
    }
  }

  const mergedText = mergeAdjacentAiGeneratedText(out, registry);
  return mergeAiEditChains(mergedText, registry);
}

function mergeAdjacentAiGeneratedText(
  nodes: readonly Record<string, unknown>[],
  registry: NotePluginRegistry
): Record<string, unknown>[] {
  const text = registry.aiDiffText;
  if (!text) return [...nodes];
  const merged: Record<string, unknown>[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    const currentText = text.read(node);
    const lastText = last ? text.read(last) : undefined;
    if (currentText && lastText) {
      merged[merged.length - 1] = text.create({
        text: lastText.text + currentText.text,
        styles: lastText.styles,
      });
      continue;
    }
    merged.push(node);
  }
  return merged;
}

function mergeAiEditChains(
  nodes: readonly Record<string, unknown>[],
  registry: NotePluginRegistry
): Record<string, unknown>[] {
  // Keep the chain merge slightly looser than the base hunk split, but only across
  // very short shared bridges so separate edits are less likely to be over-merged.
  const mergeOptions = {
    ...DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
    maxGapChars: 4,
    maxGapTokens: 2,
    breakOnSentenceEnd: false,
    breakOnClauseBoundary: false,
  };
  const merged: Record<string, unknown>[] = [];

  const isSentenceEndChar = (ch: string): boolean => '。！？；'.includes(ch) || '.?!'.includes(ch);
  const segmentEndsWithSentencePunctuation = (text: string): boolean => {
    const t = text.trimEnd();
    if (t.length === 0) return false;
    return isSentenceEndChar(t[t.length - 1]);
  };
  const containsClauseBoundary = (text: string): boolean => /[，,；;：:]/.test(text);
  const visibleLen = (text: string): number => text.length;
  const canMergeAcrossSharedText = (sharedText: string, currentVisibleLen: number): boolean => {
    if (mergeOptions.breakOnNewline && sharedText.includes('\n')) return false;
    if (visibleLen(sharedText) > mergeOptions.maxGapChars) return false;
    if (tokenizeForAiEdit(sharedText).length > mergeOptions.maxGapTokens) return false;
    if (mergeOptions.preferSemanticBoundary) {
      if (mergeOptions.breakOnSentenceEnd && segmentEndsWithSentencePunctuation(sharedText))
        return false;
      if (mergeOptions.breakOnClauseBoundary && containsClauseBoundary(sharedText)) return false;
    }
    return currentVisibleLen + visibleLen(sharedText) <= mergeOptions.maxMergedLength;
  };

  let i = 0;
  while (i < nodes.length) {
    const current = nodes[i];
    if (!isAiGeneratedInline(current) || current.type !== 'AI-Edit') {
      merged.push(current);
      i += 1;
      continue;
    }

    let oldText = toStringOrEmpty(current.old_text) || toStringOrEmpty(current.text_old);
    let newText = toStringOrEmpty(current.new_text) || toStringOrEmpty(current.text_new);
    const styles = isRecord(current.styles) ? (current.styles as Record<string, string>) : {};
    let mergedVisibleLen = Math.max(oldText.length, newText.length);
    let cursor = i + 1;

    // Merge chain: AI-Edit + text + AI-Edit (+ text + AI-Edit ...)
    while (cursor + 1 < nodes.length) {
      const shared = nodes[cursor];
      const next = nodes[cursor + 1];
      const sharedText = registry.aiDiffText?.read(shared)?.text;
      if (!sharedText || !isAiGeneratedInline(next) || next.type !== 'AI-Edit') break;
      if (!canMergeAcrossSharedText(sharedText, mergedVisibleLen)) break;
      const nextOldText =
        oldText + sharedText + (toStringOrEmpty(next.old_text) || toStringOrEmpty(next.text_old));
      const nextNewText =
        newText + sharedText + (toStringOrEmpty(next.new_text) || toStringOrEmpty(next.text_new));
      const nextVisibleLen = Math.max(nextOldText.length, nextNewText.length);
      if (nextVisibleLen > mergeOptions.maxMergedLength) break;
      oldText = nextOldText;
      newText = nextNewText;
      mergedVisibleLen = nextVisibleLen;
      cursor += 2;
    }

    merged.push({
      type: 'AI-Edit',
      old_text: oldText,
      new_text: newText,
      styles,
      normalizedKey: current.normalizedKey,
    });
    i = cursor;
  }

  return mergeAdjacentAiGeneratedText(merged, registry);
}

function aiGeneratedMathProps(
  rawProps: Record<string, JsonValue>,
  content: unknown,
  keyPrefix: string
): Record<string, JsonValue> | null {
  if (!Array.isArray(content)) {
    return {
      ...rawProps,
      expression: toStringOrEmpty(rawProps['expression']),
    };
  }

  const aiItem = content.find(isAiGeneratedInline);
  if (!aiItem || !isAiGeneratedInline(aiItem)) {
    return {
      ...rawProps,
      expression: toStringOrEmpty(rawProps['expression']),
    };
  }

  const key = `${keyPrefix}:math`;
  if (aiItem.type === 'AI-Create') {
    const expression = toStringOrEmpty(aiItem.text);
    return {
      ...rawProps,
      expression,
      aiDiffType: 'create',
      aiDiffKey: key,
      aiDiffOrigin: '',
      aiDiffReplace: expression,
    };
  }

  if (aiItem.type === 'AI-Delete') {
    const expression = toStringOrEmpty(aiItem.text);
    return {
      ...rawProps,
      expression,
      aiDiffType: 'delete',
      aiDiffKey: key,
      aiDiffOrigin: expression,
      aiDiffReplace: '',
    };
  }

  const { origin, replace } = resolveAiGeneratedEditText(aiItem);
  return {
    ...rawProps,
    expression: replace || origin,
    aiDiffType: 'edit',
    aiDiffKey: key,
    aiDiffOrigin: origin,
    aiDiffReplace: replace,
  };
}

export const richTextBlockAiDiff: NoteBlockAiDiff = {
  normalizeGenerated({ props, content, keyPrefix }, registry) {
    const normalized = normalizeAiGeneratedInlineContent(content, keyPrefix, registry);
    if (!normalized) return null;
    const mapped = aiGeneratedInlineToInlineContentArray(normalized);
    return mapped ? { props, content: mapped } : null;
  },
  applyAll(block, action, registry) {
    const content = applyAllAiDiffActionsToContent(block.content, action, registry);
    if (!content) return { kind: 'none' };
    return {
      kind: 'update',
      content,
      removeWhenChildless: isInlineContentEffectivelyEmpty(content),
    };
  },
};

export const atomicPropsBlockAiDiff: NoteBlockAiDiff = {
  normalizeGenerated({ props, content }) {
    return content == null || (Array.isArray(content) && content.length === 0) ? { props } : null;
  },
  applyAll() {
    return { kind: 'none' };
  },
};

export const mathBlockAiDiff: NoteBlockAiDiff = {
  isPresent: hasAtomicAiDiff,
  normalizeGenerated({ props, content, keyPrefix }) {
    const mappedProps = aiGeneratedMathProps(toJsonProps(props), content, keyPrefix);
    return mappedProps ? { props: mappedProps } : null;
  },
  applyAll(block, action) {
    const result = applyAiDiffActionToProps(block.props, action);
    if (result.kind === 'remove' || result.kind === 'none') return result;
    return { kind: 'update', props: result.props };
  },
};

export function aiGeneratedBlocksToBlockNoteBlocks(
  input: unknown,
  registry: NotePluginRegistry
): unknown[] | null {
  const seed = `ai-${hashStableValue(input)}`;
  return aiGeneratedBlocksToBlockNoteBlocksInner(input, seed, 'root', registry);
}

function hashStableValue(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function aiGeneratedBlocksToBlockNoteBlocksInner(
  input: unknown,
  seed: string,
  path: string,
  registry: NotePluginRegistry
): unknown[] | null {
  if (!Array.isArray(input)) return null;
  const out: unknown[] = [];
  for (let idx = 0; idx < input.length; idx += 1) {
    const raw = input[idx];
    if (!isRecord(raw)) return null;
    const id = toStringOrEmpty(raw['id']);
    const type = toStringOrEmpty(raw['type']);
    if (!id || !type) return null;
    const owner = registry.blockPlugins.get(type);
    if (!owner?.aiDiff) return null;

    const props = toJsonProps(raw['props']);
    const content = raw['content'];
    const children = raw['children'];

    const keyPrefix = `${seed}:${path}:${id}:${idx}`;
    const projection = owner.aiDiff.normalizeGenerated({ props, content, keyPrefix }, registry);
    if (!projection) return null;
    const mappedChildren = aiGeneratedBlocksToBlockNoteBlocksInner(
      Array.isArray(children) ? children : [],
      seed,
      `${path}.${id}.${idx}`,
      registry
    );
    if (!mappedChildren) return null;

    out.push({
      id,
      type,
      props: projection.props,
      ...('content' in projection ? { content: projection.content } : {}),
      children: mappedChildren,
    });
  }
  return out;
}

function aiGeneratedInlineToInlineContentArray(content: unknown): NoteInlineContentLike[] | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;
  const nodes: NoteInlineContentLike[] = [];
  for (const item of content) {
    if (!isRecord(item)) return null;
    if (!isAiGeneratedInline(item)) {
      nodes.push(item);
      continue;
    }

    const key = toStringOrEmpty(item.normalizedKey);
    if (!key) return null;
    if (item.type === 'AI-Create') {
      nodes.push({ type: 'ai-add', props: { text: toStringOrEmpty(item.text), key } });
      continue;
    }
    if (item.type === 'AI-Delete') {
      nodes.push({ type: 'ai-delete', props: { text: toStringOrEmpty(item.text), key } });
      continue;
    }
    if (item.type === 'AI-Edit') {
      const origin = toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old);
      const replace = toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new);
      if (origin === '' && replace === '') continue;
      nodes.push({
        type: 'ai-diff',
        props: {
          origin,
          replace,
          key,
          granularity: 'word',
        },
      });
      continue;
    }
  }
  return mergeAdjacentText(nodes);
}

function mapAiGeneratedLinkContent(content: unknown): TextInlineContent[] {
  if (!Array.isArray(content)) {
    return [];
  }
  const out: TextInlineContent[] = [];
  for (const child of content) {
    if (!isRecord(child)) {
      continue;
    }
    if (child['type'] !== 'text') {
      continue;
    }
    const text = toStringOrEmpty(child['text']);
    if (!text) {
      continue;
    }
    out.push({
      type: 'text',
      text,
      styles: isRecord(child['styles']) ? (child['styles'] as Record<string, string>) : {},
    });
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getType(v: unknown): string | undefined {
  if (!isRecord(v)) return undefined;
  const t = v['type'];
  return typeof t === 'string' ? t : undefined;
}

function getProps(v: unknown): Record<string, unknown> | undefined {
  if (!isRecord(v)) return undefined;
  const p = v['props'];
  return isRecord(p) ? p : undefined;
}

function getPropString(props: Record<string, unknown> | undefined, key: string): string {
  const v = props?.[key];
  return typeof v === 'string' ? v : '';
}

function getText(v: unknown): string {
  if (!isRecord(v)) return '';
  const t = v['text'];
  return typeof t === 'string' ? t : '';
}

function getLinkContentFromProps(props: Record<string, unknown>): TextInlineContent[] {
  const serialized = getPropString(props, 'content');
  const fallbackText = getPropString(props, 'text');
  if (!serialized) return fallbackText ? [toTextInline(fallbackText)] : [];
  try {
    const content = mapAiGeneratedLinkContent(JSON.parse(serialized));
    return content.length > 0 ? content : fallbackText ? [toTextInline(fallbackText)] : [];
  } catch {
    return fallbackText ? [toTextInline(fallbackText)] : [];
  }
}

export function applyAiDiffActionForKey(
  content: unknown,
  key: string,
  mode: NoteAiDiffAction
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  const nodes = content as unknown[];
  const changeIndex = nodes.findIndex((n) => {
    const t = getType(n);
    const props = getProps(n);
    if (!t || !AI_DIFF_INLINE_TYPES.has(t)) {
      return false;
    }
    return typeof props?.['key'] === 'string' && props['key'] === key;
  });
  if (changeIndex < 0) return null;

  const changeType = getType(nodes[changeIndex]);
  const changeProps = getProps(nodes[changeIndex]) ?? {};
  const replacement = changeType ? resolveAiInlineReplacement(changeType, changeProps, mode) : [];

  const out: NoteInlineContentLike[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    if (i === changeIndex) {
      out.push(...replacement);
      continue;
    }
    out.push(nodes[i] as Record<string, unknown>);
  }
  return mergeAdjacentText(out);
}

export function resolveAiInlineReplacement(
  changeType: string,
  changeProps: Record<string, unknown>,
  mode: NoteAiDiffAction
): NoteInlineContentLike[] {
  const replacement: NoteInlineContentLike[] = [];

  if (changeType === 'ai-diff') {
    const nextText =
      mode === 'accept'
        ? getPropString(changeProps, 'replace')
        : getPropString(changeProps, 'origin');
    if (nextText) replacement.push(toTextInline(nextText));
  } else if (changeType === 'ai-add') {
    const text = getPropString(changeProps, 'text');
    if (mode === 'accept' && text) replacement.push(toTextInline(text));
  } else if (changeType === 'ai-delete') {
    const text = getPropString(changeProps, 'text');
    if (mode === 'discard' && text) replacement.push(toTextInline(text));
  } else if (changeType === 'ai-link-add') {
    const text = getPropString(changeProps, 'text');
    const href = getPropString(changeProps, 'href');
    if (mode === 'accept' && (text || href)) {
      replacement.push(toLinkInline(text, href, getLinkContentFromProps(changeProps)));
    }
  } else if (changeType === 'ai-link-delete') {
    const text = getPropString(changeProps, 'text');
    const href = getPropString(changeProps, 'href');
    if (mode === 'discard' && (text || href)) {
      replacement.push(toLinkInline(text, href, getLinkContentFromProps(changeProps)));
    }
  }

  return replacement;
}

function clearAiDiffProps(props: Record<string, unknown>): Record<string, unknown> {
  return {
    ...props,
    aiDiffType: '',
    aiDiffKey: '',
    aiDiffOrigin: '',
    aiDiffReplace: '',
  };
}

export function applyAiDiffActionToProps(
  props: unknown,
  mode: NoteAiDiffAction
): AiDiffPropsActionResult {
  if (!isRecord(props)) return { kind: 'none' };

  const aiDiffType = getPropString(props, 'aiDiffType');
  if (!AI_DIFF_PROP_TYPES.has(aiDiffType)) return { kind: 'none' };

  const baseProps = clearAiDiffProps(props);
  const origin = getPropString(props, 'aiDiffOrigin');
  const replace = getPropString(props, 'aiDiffReplace');

  if (aiDiffType === 'create') {
    if (mode === 'discard') return { kind: 'remove' };
    return { kind: 'update', props: { ...baseProps, expression: replace } };
  }

  if (aiDiffType === 'delete') {
    if (mode === 'accept') return { kind: 'remove' };
    return { kind: 'update', props: { ...baseProps, expression: origin } };
  }

  return {
    kind: 'update',
    props: {
      ...baseProps,
      expression: mode === 'accept' ? replace : origin,
    },
  };
}

export function applyAllAiDiffActionsToContent(
  content: unknown,
  mode: NoteAiDiffAction,
  registry: NotePluginRegistry
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    if (!isRecord(node)) {
      out.push(node as NoteInlineContentLike);
      continue;
    }
    const type = getType(node);
    const owner = type ? registry.inlinePlugins.get(type) : undefined;
    const replacement = owner?.aiDiff.apply(node, mode);
    if (replacement !== undefined) {
      changed = true;
      out.push(...replacement);
      continue;
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? mergeAdjacentText(out) : null;
}

export function editAiLinkInlineContentForKey(
  content: unknown,
  key: string,
  payload: { text: string; href: string }
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    const type = getType(node);
    const props = getProps(node) ?? {};
    const nodeKey = getPropString(props, 'key');

    if ((type === 'ai-link-add' || type === 'ai-link-delete') && nodeKey === key) {
      changed = true;
      out.push({
        ...(node as Record<string, unknown>),
        props: {
          ...props,
          text: payload.text,
          href: payload.href,
        },
      });
      continue;
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? out : null;
}

export function clearAiLinkInlineContentForKey(
  content: unknown,
  key: string
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  let changed = false;
  const out: NoteInlineContentLike[] = [];

  for (const node of content as unknown[]) {
    const type = getType(node);
    const props = getProps(node) ?? {};
    const nodeKey = getPropString(props, 'key');

    if ((type === 'ai-link-add' || type === 'ai-link-delete') && nodeKey === key) {
      changed = true;
      const text = getPropString(props, 'text');
      out.push({
        type: type === 'ai-link-add' ? 'ai-add' : 'ai-delete',
        props: {
          text,
          key,
        },
      });
      continue;
    }

    out.push(node as NoteInlineContentLike);
  }

  return changed ? mergeAdjacentText(out) : null;
}

/** True when there is no visible text and no remaining AI diff / add / delete nodes. */
export function isInlineContentEffectivelyEmpty(content: unknown): boolean {
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;
  for (const n of content) {
    const t = getType(n);
    if (t === 'text') {
      if (getText(n).trim() !== '') return false;
      continue;
    }
    return false;
  }
  return true;
}

function mergeAdjacentText(nodes: readonly NoteInlineContentLike[]): NoteInlineContentLike[] {
  const merged: NoteInlineContentLike[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (getType(last) === 'text' && getType(node) === 'text') {
      const lastText = getText(last);
      const nextText = getText(node);
      merged[merged.length - 1] = toTextInline(lastText + nextText);
      continue;
    }
    merged.push(node);
  }
  return merged;
}
