import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import type { NotePluginRegistry } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readType(value: Record<string, unknown>): string | undefined {
  return typeof value.type === 'string' ? value.type : undefined;
}

export function hasAiDiffInInlineContent(content: unknown, registry: NotePluginRegistry): boolean {
  if (!Array.isArray(content)) return false;

  return content.some((inline) => {
    if (!isRecord(inline)) return false;
    const type = readType(inline);
    const owner = type ? registry.inlinePlugins.get(type) : undefined;
    if (owner?.aiDiff.isPresent(inline)) return true;
    return hasAiDiffInInlineContent(inline.content, registry);
  });
}

export function hasAiDiffInBlock(block: unknown, registry: NotePluginRegistry): boolean {
  if (!isRecord(block)) return false;

  const type = readType(block);
  const owner = type ? registry.blockPlugins.get(type) : undefined;
  if (owner?.aiDiff?.isPresent?.(block)) return true;
  if (hasAiDiffInInlineContent(block.content, registry)) return true;

  const children = block.children;
  return Array.isArray(children) && children.some((child) => hasAiDiffInBlock(child, registry));
}

export function hasAiDiffContentFromEditor<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>, registry: NotePluginRegistry): boolean {
  let hasAiDiffContent = false;

  editor.forEachBlock((block) => {
    hasAiDiffContent = hasAiDiffInBlock(block, registry);
    return !hasAiDiffContent;
  });

  return hasAiDiffContent;
}
