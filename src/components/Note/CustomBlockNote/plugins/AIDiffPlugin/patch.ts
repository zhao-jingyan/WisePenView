import {
  buildAiEditJsonUnits,
  DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
  tokenizeForAiEdit,
} from './wordDiff';

export type AiPatchKeep = { action: 'keep'; text: string };
export type AiPatchDelete = { action: 'delete'; text: string };
export type AiPatchAdd = { action: 'add'; text: string };
export type AiPatchDiff = { action: 'diff'; origin: string; replace: string };

export type AiPatchItem = AiPatchKeep | AiPatchDelete | AiPatchAdd | AiPatchDiff;

type TextInlineContent = { type: 'text'; text: string; styles?: Record<string, string> };
type AiDiffInlineContent = {
  type: 'ai-diff';
  props: { origin: string; replace: string; key: string };
};
type AiAddInlineContent = { type: 'ai-add'; props: { text: string; key: string } };
type AiDeleteInlineContent = { type: 'ai-delete'; props: { text: string; key: string } };

export type NoteInlineContentLike =
  | TextInlineContent
  | AiDiffInlineContent
  | AiAddInlineContent
  | AiDeleteInlineContent
  | Record<string, unknown>;

export type AiPatchValidationResult =
  | { ok: true; reconstructed: string }
  | { ok: false; reconstructed: string; original: string };

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

const SUPPORTED_SCHEMA_BLOCK_TYPES = new Set([
  'audio',
  'bulletListItem',
  'checkListItem',
  'codeBlock',
  'divider',
  'file',
  'heading',
  'image',
  'math',
  'numberedListItem',
  'paragraph',
  'quote',
  'table',
  'toggleListItem',
  'video',
]);

const EXCLUDED_CODE_BLOCK_TYPES = new Set(['codeBlock']);

const INLINE_AI_DIFF_BLOCK_TYPES = new Set([
  'bulletListItem',
  'checkListItem',
  'heading',
  'numberedListItem',
  'paragraph',
  'quote',
  'toggleListItem',
]);

const CONTENT_NONE_AI_BLOCK_TYPES = new Set(['audio', 'divider', 'file', 'image', 'math', 'video']);

export function validateAiPatchAgainstOriginal(
  original: string,
  patch: readonly AiPatchItem[]
): AiPatchValidationResult {
  const reconstructed = patch
    .map((item) => {
      if (item.action === 'keep') return item.text;
      if (item.action === 'delete') return item.text;
      if (item.action === 'diff') return item.origin;
      return '';
    })
    .join('');

  if (reconstructed === original) {
    return { ok: true, reconstructed };
  }
  return { ok: false, reconstructed, original };
}

function toTextInline(text: string): TextInlineContent {
  return { type: 'text', text, styles: {} };
}

export function aiPatchToInlineContent(patch: readonly AiPatchItem[]): NoteInlineContentLike[] {
  const nodes: NoteInlineContentLike[] = [];
  let serial = 0;
  for (const item of patch) {
    if (item.action === 'keep') {
      if (item.text) nodes.push(toTextInline(item.text));
      continue;
    }
    if (item.action === 'diff') {
      serial += 1;
      const key = `c${serial}`;
      nodes.push({ type: 'ai-diff', props: { origin: item.origin, replace: item.replace, key } });
      continue;
    }
    if (item.action === 'delete') {
      serial += 1;
      const key = `c${serial}`;
      nodes.push({ type: 'ai-delete', props: { text: item.text, key } });
      continue;
    }
    if (item.action === 'add') {
      serial += 1;
      const key = `c${serial}`;
      nodes.push({ type: 'ai-add', props: { text: item.text, key } });
    }
  }
  return mergeAdjacentText(nodes);
}

export type AiGeneratedBlock = {
  id: string;
  type: string;
  props?: Record<string, JsonValue>;
  content?: unknown;
  children?: unknown;
};

type AiGeneratedInlineText = { type: 'text'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineCreate = { type: 'AI-Create'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineDelete = { type: 'AI-Delete'; text: string; styles?: Record<string, string> };
type AiGeneratedInlineEdit = {
  type: 'AI-Edit';
  old_text?: string;
  new_text?: string;
  text_old?: string;
  text_new?: string;
  styles?: Record<string, string>;
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
): v is
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit {
  if (!isRecord(v)) return false;
  const t = v['type'];
  if (t === 'text') return typeof v['text'] === 'string';
  if (t === 'AI-Create') return typeof v['text'] === 'string';
  if (t === 'AI-Delete') return typeof v['text'] === 'string';
  if (t === 'AI-Edit') return true;
  return false;
}

function hasAiGeneratedInlineContent(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.some((item) => isAiGeneratedInline(item) && item.type !== 'text')
  );
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
  content: unknown
):
  | (
      | AiGeneratedInlineText
      | AiGeneratedInlineCreate
      | AiGeneratedInlineDelete
      | AiGeneratedInlineEdit
    )[]
  | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;

  const out: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
  > = [];

  for (const item of content) {
    if (!isAiGeneratedInline(item)) return null;
    if (item.type !== 'AI-Edit') {
      out.push(item);
      continue;
    }

    const origin = toStringOrEmpty(item.old_text) || toStringOrEmpty(item.text_old);
    const replace = toStringOrEmpty(item.new_text) || toStringOrEmpty(item.text_new);
    const units = buildAiEditJsonUnits(origin, replace);
    for (const unit of units) {
      if (unit.type === 'plain') {
        if (unit.text.length === 0) continue;
        out.push({
          type: 'text',
          text: unit.text,
          styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
        });
      } else {
        out.push({
          type: 'AI-Edit',
          old_text: unit.origin,
          new_text: unit.replace,
          styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
        });
      }
    }
  }

  const mergedText = mergeAdjacentAiGeneratedText(out);
  return mergeAiEditChains(mergedText);
}

function mergeAdjacentAiGeneratedText(
  nodes: readonly (
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
  )[]
): (
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit
)[] {
  const merged: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
  > = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (node.type === 'text' && last?.type === 'text') {
      last.text += node.text;
      continue;
    }
    merged.push(node);
  }
  return merged;
}

function mergeAiEditChains(
  nodes: readonly (
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
  )[]
): (
  | AiGeneratedInlineText
  | AiGeneratedInlineCreate
  | AiGeneratedInlineDelete
  | AiGeneratedInlineEdit
)[] {
  // Keep the chain merge slightly looser than the base hunk split, but only across
  // very short shared bridges so separate edits are less likely to be over-merged.
  const mergeOptions = {
    ...DEFAULT_MERGE_DIFF_HUNKS_OPTIONS,
    maxGapChars: 4,
    maxGapTokens: 2,
    breakOnSentenceEnd: false,
    breakOnClauseBoundary: false,
  };
  const merged: Array<
    | AiGeneratedInlineText
    | AiGeneratedInlineCreate
    | AiGeneratedInlineDelete
    | AiGeneratedInlineEdit
  > = [];

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
    if (current.type !== 'AI-Edit') {
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
      if (shared.type !== 'text' || next.type !== 'AI-Edit') break;
      if (!canMergeAcrossSharedText(shared.text, mergedVisibleLen)) break;
      oldText += shared.text + (toStringOrEmpty(next.old_text) || toStringOrEmpty(next.text_old));
      newText += shared.text + (toStringOrEmpty(next.new_text) || toStringOrEmpty(next.text_new));
      mergedVisibleLen = Math.max(oldText.length, newText.length);
      if (mergedVisibleLen > mergeOptions.maxMergedLength) break;
      cursor += 2;
    }

    merged.push({
      type: 'AI-Edit',
      old_text: oldText,
      new_text: newText,
      styles,
    });
    i = cursor;
  }

  return mergeAdjacentAiGeneratedText(merged);
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

  const aiItem = content.find((item) => isAiGeneratedInline(item) && item.type !== 'text');
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

export function aiGeneratedBlocksToBlockNoteBlocks(input: unknown): unknown[] | null {
  const seed = `ai-${Date.now().toString(36)}`;
  return aiGeneratedBlocksToBlockNoteBlocksInner(input, seed, 'root');
}

function aiGeneratedBlocksToBlockNoteBlocksInner(
  input: unknown,
  seed: string,
  path: string
): unknown[] | null {
  if (!Array.isArray(input)) return null;
  const out: unknown[] = [];
  for (let idx = 0; idx < input.length; idx += 1) {
    const raw = input[idx];
    if (!isRecord(raw)) return null;
    const id = toStringOrEmpty(raw['id']);
    const type = toStringOrEmpty(raw['type']);
    if (!id || !type) return null;
    if (!SUPPORTED_SCHEMA_BLOCK_TYPES.has(type)) return null;
    if (EXCLUDED_CODE_BLOCK_TYPES.has(type)) return null;

    const props = toJsonProps(raw['props']);
    const content = raw['content'];
    const children = raw['children'];

    const keyPrefix = `${seed}:${path}:${id}:${idx}`;
    const isInlineBlock = INLINE_AI_DIFF_BLOCK_TYPES.has(type);
    const isContentNoneBlock = CONTENT_NONE_AI_BLOCK_TYPES.has(type);
    const normalizedInlineContent = isInlineBlock
      ? normalizeAiGeneratedInlineContent(content)
      : null;
    if (isInlineBlock && !normalizedInlineContent) return null;
    const mappedContent = isInlineBlock
      ? aiGeneratedInlineToInlineContentArray(normalizedInlineContent, keyPrefix)
      : [];
    if (isInlineBlock && !mappedContent) return null;
    if (!isInlineBlock && type !== 'math' && hasAiGeneratedInlineContent(content)) return null;

    const mappedChildren =
      aiGeneratedBlocksToBlockNoteBlocksInner(
        Array.isArray(children) ? children : [],
        seed,
        `${path}.${id}.${idx}`
      ) ?? [];
    const mappedProps = type === 'math' ? aiGeneratedMathProps(props, content, keyPrefix) : props;
    if (!mappedProps) return null;

    out.push({
      type,
      props: mappedProps,
      ...(isContentNoneBlock ? {} : { content: mappedContent }),
      children: mappedChildren,
    });
  }
  return out;
}

function aiGeneratedInlineToInlineContentArray(
  content: unknown,
  keyPrefix: string
): NoteInlineContentLike[] | null {
  if (content == null) return [];
  if (!Array.isArray(content)) return null;
  const nodes: NoteInlineContentLike[] = [];
  let serial = 0;

  for (let idx = 0; idx < content.length; idx += 1) {
    const item = content[idx];
    if (!isAiGeneratedInline(item)) return null;
    if (item.type === 'text') {
      nodes.push({
        type: 'text',
        text: toStringOrEmpty(item.text),
        styles: isRecord(item.styles) ? (item.styles as Record<string, string>) : {},
      });
      continue;
    }

    serial += 1;
    const key = `${keyPrefix}:c${serial}`;
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

export function hasAiDiffInlineContent(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some((n) => {
    const t = getType(n);
    return t === 'ai-diff' || t === 'ai-add' || t === 'ai-delete';
  });
}

function applyAiDiffInlineContentAll(
  content: unknown,
  mode: 'accept' | 'discard'
): NoteInlineContentLike[] {
  if (!Array.isArray(content)) return [];
  const out: NoteInlineContentLike[] = [];
  for (const n of content) {
    const t = getType(n);
    if (t === 'ai-diff') {
      const props = getProps(n);
      const nextText =
        mode === 'accept' ? getPropString(props, 'replace') : getPropString(props, 'origin');
      if (nextText) out.push(toTextInline(nextText));
      continue;
    }
    if (t === 'ai-add') {
      if (mode === 'accept') {
        const text = getPropString(getProps(n), 'text');
        if (text) out.push(toTextInline(text));
      }
      continue;
    }
    if (t === 'ai-delete') {
      if (mode === 'discard') {
        const text = getPropString(getProps(n), 'text');
        if (text) out.push(toTextInline(text));
      }
      continue;
    }
    if (t === 'text') {
      const text = getText(n);
      if (text) out.push(toTextInline(text));
      continue;
    }
    out.push(n as Record<string, unknown>);
  }
  return mergeAdjacentText(out);
}

export function acceptAiDiffInlineContent(content: unknown): NoteInlineContentLike[] {
  return applyAiDiffInlineContentAll(content, 'accept');
}

export function discardAiDiffInlineContent(content: unknown): NoteInlineContentLike[] {
  return applyAiDiffInlineContentAll(content, 'discard');
}

export function applyAiDiffActionForKey(
  content: unknown,
  key: string,
  mode: 'accept' | 'discard'
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content)) return null;
  if (!key) return null;

  const nodes = content as unknown[];
  const changeIndex = nodes.findIndex((n) => {
    const t = getType(n);
    if (t !== 'ai-diff' && t !== 'ai-add' && t !== 'ai-delete') return false;
    const props = getProps(n);
    return typeof props?.['key'] === 'string' && props['key'] === key;
  });
  if (changeIndex < 0) return null;

  const changeType = getType(nodes[changeIndex]);
  const changeProps = getProps(nodes[changeIndex]) ?? {};
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
  }

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

/** True when there is no visible text and no remaining AI diff / add / delete nodes. */
export function isInlineContentEffectivelyEmpty(content: unknown): boolean {
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;
  for (const n of content) {
    const t = getType(n);
    if (t === 'ai-diff' || t === 'ai-add' || t === 'ai-delete') {
      return false;
    }
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
