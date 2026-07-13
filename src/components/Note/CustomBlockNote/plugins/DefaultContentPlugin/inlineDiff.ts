import { projectInlinePlainText } from '../../content/projection';
import type { NotePluginRegistry } from '../../content/types';
import { stableStringify } from '../../engines/aiDiff/stableValue';
import { buildAiDiffTextHunks, type AiDiffTextHunk } from '../../engines/aiDiff/wordDiff';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function withoutField(
  value: Record<string, unknown>,
  field: 'text' | 'content'
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function normalizeInlineContent(content: readonly Record<string, unknown>[]) {
  const normalized: Record<string, unknown>[] = [];
  for (const inline of content) {
    if (inline.type === 'text') {
      const text = typeof inline.text === 'string' ? inline.text : '';
      if (!text) continue;
      const previous = normalized.at(-1);
      if (
        previous?.type === 'text' &&
        stableStringify(withoutField(previous, 'text')) ===
          stableStringify(withoutField(inline, 'text'))
      ) {
        previous.text = String(previous.text ?? '') + text;
      } else {
        normalized.push({ ...inline, text });
      }
      continue;
    }

    if (inline.type === 'link' && Array.isArray(inline.content)) {
      const children = normalizeInlineContent(inline.content.filter(isRecord));
      if (children.length === 0) continue;
      const previous = normalized.at(-1);
      if (
        previous?.type === 'link' &&
        Array.isArray(previous.content) &&
        stableStringify(withoutField(previous, 'content')) ===
          stableStringify(withoutField(inline, 'content'))
      ) {
        previous.content = normalizeInlineContent([
          ...previous.content.filter(isRecord),
          ...children,
        ]);
      } else {
        normalized.push({ ...inline, content: children });
      }
      continue;
    }

    normalized.push({ ...inline });
  }
  return normalized;
}

function sliceInlineContent(
  content: unknown,
  from: number,
  to: number,
  registry: NotePluginRegistry
): Record<string, unknown>[] | null {
  if (!Array.isArray(content) || from < 0 || to < from) return null;
  const result: Record<string, unknown>[] = [];
  let offset = 0;

  for (const inline of content) {
    if (!isRecord(inline)) return null;
    const text = projectInlinePlainText([inline], registry);
    const inlineFrom = offset;
    const inlineTo = inlineFrom + text.length;
    offset = inlineTo;

    if (text.length === 0) {
      if (inline.type === 'text' && inline.text === '') continue;
      return null;
    }
    if (inlineTo <= from || inlineFrom >= to) continue;

    const localFrom = Math.max(0, from - inlineFrom);
    const localTo = Math.min(text.length, to - inlineFrom);
    if (localFrom === 0 && localTo === text.length) {
      result.push(inline);
      continue;
    }
    if (inline.type === 'text' && typeof inline.text === 'string') {
      result.push({ ...inline, text: inline.text.slice(localFrom, localTo) });
      continue;
    }
    if (inline.type === 'link') {
      const children = sliceInlineContent(inline.content, localFrom, localTo, registry);
      if (!children) return null;
      result.push({ ...inline, content: children });
      continue;
    }
    return null;
  }

  if (to > offset) return null;
  return normalizeInlineContent(result);
}

export function acceptInlineTextRange(params: {
  current: unknown;
  candidate: unknown;
  hunk: AiDiffTextHunk;
  registry: NotePluginRegistry;
}): Record<string, unknown>[] | null {
  const { current, candidate, hunk, registry } = params;
  const currentText = projectInlinePlainText(current, registry);
  const candidateText = projectInlinePlainText(candidate, registry);
  const prefix = sliceInlineContent(current, 0, hunk.originFrom, registry);
  const accepted = sliceInlineContent(
    candidate,
    hunk.replacementFrom,
    hunk.replacementTo,
    registry
  );
  const suffix = sliceInlineContent(current, hunk.originTo, currentText.length, registry);
  if (!prefix || !accepted || !suffix) return null;

  const result = normalizeInlineContent([...prefix, ...accepted, ...suffix]);
  const expectedText =
    currentText.slice(0, hunk.originFrom) +
    candidateText.slice(hunk.replacementFrom, hunk.replacementTo) +
    currentText.slice(hunk.originTo);
  return projectInlinePlainText(result, registry) === expectedText ? result : null;
}

/** 接受一个展示 hunk，并保留范围外已有的 inline 样式与链接结构。 */
export function acceptInlineTextHunk(params: {
  current: unknown;
  candidate: unknown;
  hunkIndex: number;
  registry: NotePluginRegistry;
}): Record<string, unknown>[] | null {
  const { current, candidate, hunkIndex, registry } = params;
  if (!Number.isInteger(hunkIndex) || hunkIndex < 0) return null;
  const hunk = buildAiDiffTextHunks(
    projectInlinePlainText(current, registry),
    projectInlinePlainText(candidate, registry)
  ).filter((item) => item.mode === 'hunk')[hunkIndex];
  return hunk ? acceptInlineTextRange({ current, candidate, hunk, registry }) : null;
}
