import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import type { NoteAiDiffAction, NoteInlineAiDiff } from '../types';

type NoteInlineContentLike = Record<string, unknown>;

const AI_CHANGE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function typeOf(value: unknown): string {
  return isRecord(value) && typeof value.type === 'string' ? value.type : '';
}

function propsOf(value: unknown): Record<string, unknown> {
  return isRecord(value) && isRecord(value.props) ? value.props : {};
}

function stringProp(props: Record<string, unknown>, key: string): string {
  return typeof props[key] === 'string' ? props[key] : '';
}

function textInline(text: string): NoteInlineContentLike {
  return { type: 'text', text, styles: {} };
}

function linkTextContent(props: Record<string, unknown>): NoteInlineContentLike[] {
  const serialized = stringProp(props, 'content');
  const fallback = stringProp(props, 'text');
  if (!serialized) return fallback ? [textInline(fallback)] : [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return fallback ? [textInline(fallback)] : [];
    const content = parsed.filter(
      (item): item is Record<string, unknown> => isRecord(item) && item.type === 'text'
    );
    return content.length > 0 ? content : fallback ? [textInline(fallback)] : [];
  } catch {
    return fallback ? [textInline(fallback)] : [];
  }
}

function resolveAiChange(
  type: string,
  props: Record<string, unknown>,
  action: NoteAiDiffAction
): NoteInlineContentLike[] {
  if (type === 'ai-diff') {
    const text = stringProp(props, action === 'accept' ? 'replace' : 'origin');
    return text ? [textInline(text)] : [];
  }
  if (type === 'ai-add') {
    const text = stringProp(props, 'text');
    return action === 'accept' && text ? [textInline(text)] : [];
  }
  if (type === 'ai-delete') {
    const text = stringProp(props, 'text');
    return action === 'discard' && text ? [textInline(text)] : [];
  }
  if (type === 'ai-link-add' || type === 'ai-link-delete') {
    const shouldRestore =
      (type === 'ai-link-add' && action === 'accept') ||
      (type === 'ai-link-delete' && action === 'discard');
    const text = stringProp(props, 'text');
    const href = stringProp(props, 'href');
    return shouldRestore && (text || href)
      ? [{ type: 'link', href, content: linkTextContent(props) }]
      : [];
  }
  return [];
}

export function createAiChangeInlineAiDiff(type: string): NoteInlineAiDiff {
  return {
    reviewChange: true,
    isPresent: () => true,
    isVisible(inline, mode) {
      const props = propsOf(inline);
      if (mode === AI_DIFF_DISPLAY_MODE.COMPARE) {
        return type === 'ai-diff'
          ? Boolean(stringProp(props, 'origin') || stringProp(props, 'replace'))
          : Boolean(stringProp(props, 'text'));
      }
      const action = mode === AI_DIFF_DISPLAY_MODE.NEW_ONLY ? 'accept' : 'discard';
      return resolveAiChange(type, props, action).length > 0;
    },
    apply: (inline, action) => resolveAiChange(type, propsOf(inline), action),
    normalizeGenerated: (inline) => [inline],
  };
}

function mergeAdjacentText(content: readonly NoteInlineContentLike[]): NoteInlineContentLike[] {
  const merged: NoteInlineContentLike[] = [];
  for (const node of content) {
    const previous = merged[merged.length - 1];
    if (typeOf(previous) === 'text' && typeOf(node) === 'text') {
      merged[merged.length - 1] = textInline(
        stringProp(previous, 'text') + stringProp(node, 'text')
      );
    } else {
      merged.push(node);
    }
  }
  return merged;
}

export function applyAiChangeForKey(
  content: unknown,
  key: string,
  action: NoteAiDiffAction
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content) || !key) return null;
  const index = content.findIndex((node) => {
    const type = typeOf(node);
    return AI_CHANGE_TYPES.has(type) && stringProp(propsOf(node), 'key') === key;
  });
  if (index < 0) return null;

  const result: NoteInlineContentLike[] = [];
  for (let cursor = 0; cursor < content.length; cursor += 1) {
    const node = content[cursor];
    if (cursor === index) {
      result.push(...resolveAiChange(typeOf(node), propsOf(node), action));
    } else if (isRecord(node)) {
      result.push(node);
    }
  }
  return mergeAdjacentText(result);
}

export function editAiLinkChangeForKey(
  content: unknown,
  key: string,
  payload: { text: string; href: string }
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content) || !key) return null;
  let changed = false;
  const result = content.map((node) => {
    const type = typeOf(node);
    const props = propsOf(node);
    if ((type === 'ai-link-add' || type === 'ai-link-delete') && stringProp(props, 'key') === key) {
      changed = true;
      return { ...node, props: { ...props, ...payload } } as NoteInlineContentLike;
    }
    return node as NoteInlineContentLike;
  });
  return changed ? result : null;
}

export function clearAiLinkChangeForKey(
  content: unknown,
  key: string
): NoteInlineContentLike[] | null {
  if (!Array.isArray(content) || !key) return null;
  let changed = false;
  const result = content.map((node) => {
    const type = typeOf(node);
    const props = propsOf(node);
    if ((type === 'ai-link-add' || type === 'ai-link-delete') && stringProp(props, 'key') === key) {
      changed = true;
      return {
        type: type === 'ai-link-add' ? 'ai-add' : 'ai-delete',
        props: { text: stringProp(props, 'text'), key },
      };
    }
    return node as NoteInlineContentLike;
  });
  return changed ? mergeAdjacentText(result) : null;
}

export function isInlineContentEffectivelyEmpty(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return true;
  return content.every((node) => typeOf(node) === 'text' && stringProp(node, 'text').trim() === '');
}
