import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import type { NotePluginRegistry } from '../../registry/types';
import { projectBlockPlainText } from '../plainText';
import type { NoteOutlineItem } from './index.type';

export interface NoteOutlineBlockSnapshot {
  id: string;
  contributesToOutline: boolean;
}

export interface NoteOutlineProjection {
  items: NoteOutlineItem[];
  blocks: NoteOutlineBlockSnapshot[];
}

function toBlockRecord(block: unknown): Record<string, unknown> {
  return typeof block === 'object' && block !== null ? (block as Record<string, unknown>) : {};
}

export function buildNoteOutlineProjection<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  registry: NotePluginRegistry
): NoteOutlineProjection {
  const items: NoteOutlineItem[] = [];
  const blocks: NoteOutlineBlockSnapshot[] = [];
  editor.forEachBlock((block) => {
    const owner = registry.blockPlugins.get(block.type);
    const level = owner?.outline?.getLevel(toBlockRecord(block));
    blocks.push({ id: block.id, contributesToOutline: level !== undefined });
    if (level === undefined) return true;

    items.push({
      id: block.id,
      level,
      text: projectBlockPlainText(block, registry).replace(/\s+/g, ' ').trim(),
    });
    return true;
  });
  return { items, blocks };
}

export function resolveActiveOutlineItemId(
  blocks: readonly NoteOutlineBlockSnapshot[],
  currentBlockId: string
): string | undefined {
  const index = blocks.findIndex((block) => block.id === currentBlockId);
  if (index < 0) return undefined;
  for (let currentIndex = index; currentIndex >= 0; currentIndex -= 1) {
    if (blocks[currentIndex]?.contributesToOutline) return blocks[currentIndex]?.id;
  }
  return undefined;
}
