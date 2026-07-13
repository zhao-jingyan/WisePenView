import type * as Y from 'yjs';

import type {
  NoteAiDiffAction,
  NoteAiDiffBlockMutation,
  NotePluginRegistry,
} from '../../content/types';
import type { CustomBlockNoteEditor } from '../../noteEditor';
import { stableStringify } from './stableValue';
import {
  AI_DIFF_ACTION_ORIGIN,
  clearAiContentEntries,
  clearBlockAiContent,
  readAllAiContent,
  readBlockAiContent,
} from './store';

type ApplyAiDiffActionResult = 'applied' | 'missing' | 'stale' | 'unsupported';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findBlockById(
  blocks: readonly unknown[],
  blockId: string
): Record<string, unknown> | null {
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.id === blockId) return block;
    if (Array.isArray(block.children)) {
      const nested = findBlockById(block.children, blockId);
      if (nested) return nested;
    }
  }
  return null;
}

function collectBlockIds(block: Record<string, unknown>): string[] {
  const ids = typeof block.id === 'string' ? [block.id] : [];
  if (!Array.isArray(block.children)) return ids;
  for (const child of block.children) {
    if (isRecord(child)) ids.push(...collectBlockIds(child));
  }
  return ids;
}

function assertMutationApplied(
  editor: CustomBlockNoteEditor,
  blockId: string,
  mutation: NoteAiDiffBlockMutation
): void {
  if (mutation.kind === 'none') return;
  const nextBlock = findBlockById(editor.document, blockId);
  if (mutation.kind === 'remove') {
    if (nextBlock) throw new Error(`AI Diff block 删除未生效：${blockId}`);
    return;
  }
  if (!nextBlock) throw new Error(`AI Diff block 更新后不存在：${blockId}`);
  const propsMatch = stableStringify(nextBlock.props) === stableStringify(mutation.props);
  const contentMatch =
    !('content' in mutation) ||
    stableStringify(nextBlock.content) === stableStringify(mutation.content);
  if (!propsMatch || !contentMatch) {
    throw new Error(`AI Diff block 更新未生效：${blockId}`);
  }
}

export function applyNoteAiDiffAction(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  blockId: string;
  revision: string;
  action: NoteAiDiffAction;
}): ApplyAiDiffActionResult {
  const { doc, editor, registry, blockId, revision, action } = params;
  const payload = readBlockAiContent(doc, blockId);
  if (!payload) return 'missing';
  if (payload.revision !== revision) return 'stale';

  const block = findBlockById(editor.document, blockId);
  if (!block || typeof block.type !== 'string') return 'missing';
  const owner = registry.blockPlugins.get(block.type);
  const aiDiff = owner?.aiDiff;
  if (!aiDiff) return 'unsupported';
  const projection = aiDiff.resolve(block, payload, registry);
  if (!projection) return 'unsupported';
  if (projection.stale && (action === 'accept' || payload.operation === 'create')) return 'stale';
  const mutation = aiDiff.apply(block, payload, action, registry);

  let result: ApplyAiDiffActionResult = 'applied';
  doc.transact(() => {
    if (mutation.kind === 'remove') {
      editor.removeBlocks([block as Parameters<typeof editor.removeBlocks>[0][number]]);
    } else if (mutation.kind === 'update') {
      editor.updateBlock(
        block as Parameters<typeof editor.updateBlock>[0],
        {
          props: mutation.props,
          ...('content' in mutation ? { content: mutation.content } : {}),
        } as Parameters<typeof editor.updateBlock>[1]
      );
    }

    assertMutationApplied(editor, blockId, mutation);
    if (mutation.kind === 'remove') {
      clearAiContentEntries(doc, collectBlockIds(block));
    } else {
      result = clearBlockAiContent(doc, blockId, revision);
    }
  }, AI_DIFF_ACTION_ORIGIN);
  return result;
}

export function applyAllNoteAiDiffActions(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  action: NoteAiDiffAction;
}): ReadonlyMap<string, ApplyAiDiffActionResult> {
  const { doc, editor, registry, action } = params;
  const payloads = new Map(
    [...readAllAiContent(doc)].map(([blockId, payload]) => [blockId, payload.revision])
  );
  const results = new Map<string, ApplyAiDiffActionResult>();
  doc.transact(() => {
    for (const [blockId, revision] of payloads) {
      results.set(
        blockId,
        applyNoteAiDiffAction({ doc, editor, registry, blockId, revision, action })
      );
    }
  }, AI_DIFF_ACTION_ORIGIN);
  editor.focus();
  return results;
}
