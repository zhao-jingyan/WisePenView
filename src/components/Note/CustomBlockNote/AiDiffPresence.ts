import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

const AI_DIFF_INLINE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

const AI_DIFF_PROP_TYPES = new Set(['edit', 'create', 'delete']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getType(v: unknown): string | undefined {
  if (!isRecord(v)) return undefined;
  const type = v['type'];
  return typeof type === 'string' ? type : undefined;
}

function getProps(v: unknown): Record<string, unknown> | undefined {
  if (!isRecord(v)) return undefined;
  const props = v['props'];
  return isRecord(props) ? props : undefined;
}

function hasAiDiffProps(v: unknown): boolean {
  const props = getProps(v);
  const aiDiffType = props?.['aiDiffType'];
  return typeof aiDiffType === 'string' && AI_DIFF_PROP_TYPES.has(aiDiffType);
}

function hasAiDiffInlineContent(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some(hasAiDiffNode);
}

function hasAiDiffNode(node: unknown): boolean {
  const type = getType(node);
  if (type && AI_DIFF_INLINE_TYPES.has(type)) return true;
  if (hasAiDiffProps(node)) return true;

  if (!isRecord(node)) return false;
  return hasAiDiffInlineContent(node['content']);
}

function hasAiDiffBlock(block: unknown): boolean {
  if (hasAiDiffNode(block)) return true;
  if (!isRecord(block)) return false;

  const children = block['children'];
  return Array.isArray(children) && children.some(hasAiDiffBlock);
}

export function hasAiDiffContentFromEditor<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>): boolean {
  let hasAiDiffContent = false;

  editor.forEachBlock((block) => {
    hasAiDiffContent = hasAiDiffBlock(block);
    return !hasAiDiffContent;
  });

  return hasAiDiffContent;
}
