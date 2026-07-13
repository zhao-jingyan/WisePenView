import type { NoteAiDiffPreviewData } from '@/domains/Note';
import type * as Y from 'yjs';
import type { NoteAiContentPayload } from '../../content/types';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';

import { hashNoteBlockForAiDiff } from './projection';
import { getAiContentStore } from './store';

const initializedPreviewScenes = new WeakMap<Y.Doc, string>();

function toBlockRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** 将 domain mock 快照写入真实 BlockNote 正文与 AI sidecar；同一场景只初始化一次。 */
export function initializeAiDiffPreview(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  preview: NoteAiDiffPreviewData;
}): boolean {
  const { doc, editor, preview } = params;
  if (initializedPreviewScenes.get(doc) === preview.sceneId) return false;

  const blocks = preview.items.map((item) => item.block) as Parameters<
    CustomBlockNoteEditor['replaceBlocks']
  >[1];
  editor.replaceBlocks(editor.document, blocks);

  const payloads = new Map<string, NoteAiContentPayload>();
  preview.items.forEach((item) => {
    const normalizedBlock = editor.getBlock(item.block.id);
    if (!normalizedBlock) {
      throw new Error(`AI Diff Mock 正文块初始化失败：${item.block.id}`);
    }
    const baseHash = hashNoteBlockForAiDiff(toBlockRecord(normalizedBlock));
    payloads.set(item.block.id, {
      revision: item.revision,
      baseHash: item.stale ? `${baseHash}:stale` : baseHash,
      operation: item.operation,
      candidate: item.candidate,
    });
  });

  doc.transact(() => {
    const store = getAiContentStore(doc);
    store.clear();
    payloads.forEach((payload, blockId) => store.set(blockId, payload));
  });
  initializedPreviewScenes.set(doc, preview.sceneId);
  return true;
}
