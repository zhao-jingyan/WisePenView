import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import { notePluginRegistry } from './plugins';
import { projectBlockPlainText } from './plugins/projection';

export type FlatBlockSnapshot = {
  id: string;
  outline: boolean;
};

export interface NoteOutlineProjection {
  items: NoteOutlineItem[];
  flatBlocks: FlatBlockSnapshot[];
}

function toBlockRecord(block: unknown): Record<string, unknown> {
  return typeof block === 'object' && block !== null ? (block as Record<string, unknown>) : {};
}

export function buildOutlineProjection<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>): NoteOutlineProjection {
  const items: NoteOutlineItem[] = [];
  const flatBlocks: FlatBlockSnapshot[] = [];
  editor.forEachBlock((block) => {
    const owner = notePluginRegistry.blockPlugins.get(block.type);
    const level = owner?.projection?.outlineLevel?.(toBlockRecord(block));
    flatBlocks.push({ id: block.id, outline: level !== undefined });
    if (level === undefined) return true;

    items.push({
      id: block.id,
      level,
      text: projectBlockPlainText(block, notePluginRegistry).replace(/\s+/g, ' ').trim(),
    });
    return true;
  });
  return { items, flatBlocks };
}

export function resolveActiveHeadingId(
  flat: FlatBlockSnapshot[],
  currentId: string
): string | undefined {
  const index = flat.findIndex((block) => block.id === currentId);
  if (index < 0) return undefined;
  for (let currentIndex = index; currentIndex >= 0; currentIndex -= 1) {
    if (flat[currentIndex]?.outline) return flat[currentIndex]?.id;
  }
  return undefined;
}
