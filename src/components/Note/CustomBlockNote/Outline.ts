import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';

type UnknownInlineContent = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

export type FlatBlockSnapshot = {
  id: string;
  type: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toInlineText(v: unknown): string {
  if (typeof v === 'string') {
    return v;
  }
  if (!isRecord(v)) {
    return '';
  }
  const node = v as UnknownInlineContent;
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }
  // link / 自定义行内节点：其内容可能嵌套在 `content` 中
  const child = node.content;
  if (Array.isArray(child)) {
    return child.map(toInlineText).join('');
  }
  return '';
}

function extractPlainTextFromInlineContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const text = content.map(toInlineText).join('');
    return text.replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function buildOutlineItemsFromEditor<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>): NoteOutlineItem[] {
  const items: NoteOutlineItem[] = [];
  editor.forEachBlock((block) => {
    if (block.type !== 'heading') {
      return true;
    }
    const props = isRecord(block.props) ? block.props : undefined;
    const rawLevel = props ? (props['level'] as unknown) : undefined;
    const level = typeof rawLevel === 'number' ? rawLevel : Number(rawLevel ?? 1);
    const text = extractPlainTextFromInlineContent(block.content);
    items.push({
      id: block.id,
      level: Number.isFinite(level) && level > 0 ? level : 1,
      text,
    });
    return true;
  });
  return items;
}

export function buildFlatBlocksFromEditor<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>): FlatBlockSnapshot[] {
  const flat: FlatBlockSnapshot[] = [];
  editor.forEachBlock((block) => {
    flat.push({ id: block.id, type: block.type });
    return true;
  });
  return flat;
}

export function resolveActiveHeadingId(
  flat: FlatBlockSnapshot[],
  currentId: string
): string | undefined {
  const idx = flat.findIndex((b) => b.id === currentId);
  if (idx < 0) return undefined;
  for (let i = idx; i >= 0; i -= 1) {
    if (flat[i]?.type === 'heading') {
      return flat[i]?.id;
    }
  }
  return undefined;
}
