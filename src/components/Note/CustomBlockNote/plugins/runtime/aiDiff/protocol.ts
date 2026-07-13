import type {
  NoteAiDiffGeneratedBlockProjection,
  NoteAiDiffProtocolInline,
  NotePluginRegistry,
} from '../../types';
import type { AiGeneratedBlock } from './normalizeGeneratedBlocks';
import { stableStringify } from './stableValue';
import { AI_DIFF_MAX_LCS_CELLS } from './wordDiff';

export interface AiDiffProtoBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  'AI-content'?: unknown;
  children?: AiDiffProtoBlock[];
}

export type AiDiffProtoTransformResult =
  | { ok: true; blocks: AiGeneratedBlock[] }
  | { ok: false; reason: string; fallbackBlocks: unknown[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function jsonValue(value: unknown): unknown {
  if (value === null) return value;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, jsonValue(item)] as const)
      .filter((entry) => entry[1] !== undefined)
  );
}

function jsonProps(value: unknown): Record<string, unknown> {
  const normalized = jsonValue(value);
  return isRecord(normalized) ? normalized : {};
}

function inlineProtocol(
  value: unknown,
  registry: NotePluginRegistry
): NoteAiDiffProtocolInline | undefined {
  if (!isRecord(value)) return undefined;
  const type = stringValue(value.type);
  return type ? registry.inlinePlugins.get(type)?.aiDiff.protocol : undefined;
}

function inlineArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapWithProtocol(
  value: unknown,
  registry: NotePluginRegistry,
  action: 'plain' | 'create' | 'delete'
): readonly Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  return inlineProtocol(value, registry)?.[action](value) ?? [];
}

function visibleText(value: unknown, registry: NotePluginRegistry): string {
  if (!isRecord(value)) return '';
  return inlineProtocol(value, registry)?.visibleText(value) ?? '';
}

function isAtom(value: unknown, registry: NotePluginRegistry): boolean {
  return inlineProtocol(value, registry)?.kind === 'atom';
}

function isText(value: unknown, registry: NotePluginRegistry): boolean {
  return inlineProtocol(value, registry)?.kind === 'text';
}

function areInlineItemsEqual(
  origin: unknown,
  replace: unknown,
  registry: NotePluginRegistry
): boolean {
  if (!isRecord(origin) || !isRecord(replace) || origin.type !== replace.type) return false;
  const protocol = inlineProtocol(origin, registry);
  if (!protocol || protocol !== inlineProtocol(replace, registry)) return false;
  return (
    stableStringify(protocol.normalize(origin)) === stableStringify(protocol.normalize(replace))
  );
}

function mapPlainContent(content: readonly unknown[], registry: NotePluginRegistry) {
  return content.flatMap((item) => mapWithProtocol(item, registry, 'plain'));
}

function mapCreateContent(content: readonly unknown[], registry: NotePluginRegistry) {
  return content.flatMap((item) => mapWithProtocol(item, registry, 'create'));
}

function mapDeleteContent(content: readonly unknown[], registry: NotePluginRegistry) {
  return content.flatMap((item) => mapWithProtocol(item, registry, 'delete'));
}

function mapEditPair(
  origin: unknown,
  replace: unknown,
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] {
  if (areInlineItemsEqual(origin, replace, registry)) {
    return mapWithProtocol(replace, registry, 'plain');
  }
  if (isRecord(origin) && isRecord(replace) && origin.type === replace.type) {
    const protocol = inlineProtocol(replace, registry);
    const edited = protocol?.edit(origin, replace);
    if (edited) return edited;
  }
  return [
    ...mapWithProtocol(origin, registry, 'delete'),
    ...mapWithProtocol(replace, registry, 'create'),
  ];
}

export function extractAiDiffProtocolVisibleText(
  content: unknown,
  registry: NotePluginRegistry
): string {
  return inlineArray(content)
    .map((item) => visibleText(item, registry))
    .join('');
}

function isContentEmpty(content: readonly unknown[], registry: NotePluginRegistry): boolean {
  return (
    content.length === 0 ||
    (extractAiDiffProtocolVisibleText(content, registry).length === 0 &&
      !content.some((item) => isAtom(item, registry)))
  );
}

function areContentsEqual(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): boolean {
  return (
    origin.length === replace.length &&
    origin.every((item, index) => areInlineItemsEqual(item, replace[index], registry))
  );
}

function mapByIndex(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] | null {
  if (origin.length !== replace.length) return null;
  return origin.flatMap((item, index) => mapEditPair(item, replace[index], registry));
}

function mapSegment(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] {
  if (origin.length === 0) return mapCreateContent(replace, registry);
  if (replace.length === 0) return mapDeleteContent(origin, registry);
  return (
    mapByIndex(origin, replace, registry) ?? [
      ...mapDeleteContent(origin, registry),
      ...mapCreateContent(replace, registry),
    ]
  );
}

function textSkeleton(content: readonly unknown[], registry: NotePluginRegistry): string {
  return content
    .filter((item) => isText(item, registry))
    .map((item) => visibleText(item, registry))
    .join('');
}

function mapSameTextSkeleton(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] | null {
  const originHasAtom = origin.some((item) => isAtom(item, registry));
  const replaceHasAtom = replace.some((item) => isAtom(item, registry));
  if (!originHasAtom && !replaceHasAtom) return null;
  if (textSkeleton(origin, registry) !== textSkeleton(replace, registry)) return null;

  if (!originHasAtom) {
    return replace.flatMap((item) =>
      mapWithProtocol(item, registry, isAtom(item, registry) ? 'create' : 'plain')
    );
  }
  if (!replaceHasAtom) {
    return origin.flatMap((item) =>
      mapWithProtocol(item, registry, isAtom(item, registry) ? 'delete' : 'plain')
    );
  }
  if (origin.length !== replace.length) return null;

  const output: Record<string, unknown>[] = [];
  for (let index = 0; index < origin.length; index += 1) {
    const before = origin[index];
    const after = replace[index];
    if (isText(before, registry) && isText(after, registry)) {
      if (visibleText(before, registry) !== visibleText(after, registry)) return null;
      output.push(...mapWithProtocol(after, registry, 'plain'));
      continue;
    }
    if (isAtom(before, registry) && isAtom(after, registry)) {
      output.push(...mapEditPair(before, after, registry));
      continue;
    }
    return null;
  }
  return output;
}

function mapByLcs(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] | null {
  if (
    !origin.some((item) => isAtom(item, registry)) &&
    !replace.some((item) => isAtom(item, registry))
  ) {
    return null;
  }
  const rows = origin.length;
  const columns = replace.length;
  if (rows * columns > AI_DIFF_MAX_LCS_CELLS) return null;

  const table = Array.from({ length: rows + 1 }, () => Array<number>(columns + 1).fill(0));
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      table[row][column] = areInlineItemsEqual(origin[row], replace[column], registry)
        ? table[row + 1][column + 1] + 1
        : Math.max(table[row + 1][column], table[row][column + 1]);
    }
  }

  const output: Record<string, unknown>[] = [];
  let originStart = 0;
  let replaceStart = 0;
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (areInlineItemsEqual(origin[row], replace[column], registry)) {
      output.push(
        ...mapSegment(
          origin.slice(originStart, row),
          replace.slice(replaceStart, column),
          registry
        ),
        ...mapWithProtocol(replace[column], registry, 'plain')
      );
      row += 1;
      column += 1;
      originStart = row;
      replaceStart = column;
    } else if (table[row + 1][column] >= table[row][column + 1]) {
      row += 1;
    } else {
      column += 1;
    }
  }
  output.push(...mapSegment(origin.slice(originStart), replace.slice(replaceStart), registry));
  return output;
}

function mapTextEdit(
  origin: readonly unknown[],
  replace: readonly unknown[],
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] {
  const protocol = [...replace, ...origin]
    .map((item) => inlineProtocol(item, registry))
    .find((item) => item?.kind === 'text' && item.editText);
  return (
    protocol?.editText?.(
      extractAiDiffProtocolVisibleText(origin, registry),
      extractAiDiffProtocolVisibleText(replace, registry)
    ) ?? []
  );
}

export function transformRichTextAiDiffProtocol(
  content: unknown,
  aiContent: unknown,
  registry: NotePluginRegistry
): readonly Record<string, unknown>[] {
  const origin = inlineArray(content);
  const replace = inlineArray(aiContent);
  if (areContentsEqual(origin, replace, registry)) return mapPlainContent(replace, registry);
  if (isContentEmpty(origin, registry) && isContentEmpty(replace, registry)) return [];
  if (isContentEmpty(origin, registry)) return mapCreateContent(replace, registry);
  if (isContentEmpty(replace, registry)) return mapDeleteContent(origin, registry);

  const sameSkeleton = mapSameTextSkeleton(origin, replace, registry);
  if (sameSkeleton) return sameSkeleton;
  if (
    origin.every((item) => isText(item, registry)) &&
    replace.every((item) => isText(item, registry))
  ) {
    return mapTextEdit(origin, replace, registry);
  }
  return (
    mapByLcs(origin, replace, registry) ??
    mapByIndex(origin, replace, registry) ??
    mapSegment(origin, replace, registry)
  );
}

function transformProtoBlock(
  source: unknown,
  path: string,
  registry: NotePluginRegistry
): { ok: true; block: AiGeneratedBlock } | { ok: false; reason: string } {
  if (!isRecord(source)) return { ok: false, reason: `${path}: block is not an object` };
  const id = stringValue(source.id);
  const type = stringValue(source.type);
  if (!id || !type) return { ok: false, reason: `${path}: missing block id or type` };

  const owner = registry.blockPlugins.get(type);
  if (!owner?.aiDiff) return { ok: false, reason: `${path}: block ${type} has no AI Diff owner` };
  const hasExplicitAiContent = Object.prototype.hasOwnProperty.call(source, 'AI-content');
  const projection: NoteAiDiffGeneratedBlockProjection | null = owner.aiDiff.normalizeProtocol(
    {
      props: jsonProps(source.props),
      content: source.content,
      aiContent: hasExplicitAiContent ? source['AI-content'] : source.content,
      hasExplicitAiContent,
    },
    registry
  );
  if (!projection) return { ok: false, reason: `${path}: block ${type} rejected AI Diff protocol` };

  const children: AiGeneratedBlock[] = [];
  const sourceChildren = Array.isArray(source.children) ? source.children : [];
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const result = transformProtoBlock(sourceChildren[index], `${path}.${id}.${index}`, registry);
    if (!result.ok) return result;
    children.push(result.block);
  }
  return {
    ok: true,
    block: {
      id,
      type,
      props: projection.props,
      ...('content' in projection ? { content: projection.content } : {}),
      children,
    },
  };
}

export function transformAiDiffProtoBlocks(
  input: unknown,
  registry: NotePluginRegistry
): AiDiffProtoTransformResult {
  if (!Array.isArray(input)) {
    return { ok: false, reason: 'AI diff proto input is not an array', fallbackBlocks: [] };
  }
  const blocks: AiGeneratedBlock[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const result = transformProtoBlock(input[index], `root.${index}`, registry);
    if (!result.ok) return { ok: false, reason: result.reason, fallbackBlocks: input };
    blocks.push(result.block);
  }
  return { ok: true, blocks };
}

export function aiProtoBlocksToAiGeneratedBlocks(
  input: unknown,
  registry: NotePluginRegistry
): AiGeneratedBlock[] | null {
  const result = transformAiDiffProtoBlocks(input, registry);
  return result.ok ? result.blocks : null;
}
