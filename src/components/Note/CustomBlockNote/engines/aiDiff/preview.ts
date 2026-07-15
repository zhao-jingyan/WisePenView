import type { NoteAiDiffPreviewData } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type * as Y from 'yjs';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';

import { getAiContentStore } from './store';

const initializedPreviews = new WeakMap<Y.Doc, NoteAiDiffPreviewData>();

function splitPreviewBlocks(
  blocks: NoteAiDiffPreviewData['content'],
  aiContentByBlockId: Map<string, unknown>
): Record<string, unknown>[] {
  return blocks.map((snapshot) => {
    const { 'ai-content': aiContent, children, ...block } = snapshot;
    if (Object.prototype.hasOwnProperty.call(snapshot, 'ai-content')) {
      if (aiContent === undefined) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: `AI Diff Mock 的 ai-content 不能为 undefined：${snapshot.id}`,
        });
      }
      aiContentByBlockId.set(snapshot.id, aiContent);
    }
    return {
      ...block,
      children: splitPreviewBlocks(children, aiContentByBlockId),
    };
  });
}

/** 将 domain mock 快照写入真实 BlockNote 正文与 AI sidecar；同一场景只初始化一次。 */
export function initializeAiDiffPreview(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  preview: NoteAiDiffPreviewData;
}): boolean {
  const { doc, editor, preview } = params;
  if (initializedPreviews.get(doc) === preview) return false;

  const aiContentByBlockId = new Map<string, unknown>();
  const blocks = splitPreviewBlocks(preview.content, aiContentByBlockId) as Parameters<
    CustomBlockNoteEditor['replaceBlocks']
  >[1];
  editor.replaceBlocks(editor.document, blocks);

  aiContentByBlockId.forEach((_aiContent, blockId) => {
    if (!editor.getBlock(blockId)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `AI Diff Mock 正文块初始化失败：${blockId}`,
      });
    }
  });

  doc.transact(() => {
    const store = getAiContentStore(doc);
    store.clear();
    aiContentByBlockId.forEach((aiContent, blockId) => store.set(blockId, aiContent));
  });
  initializedPreviews.set(doc, preview);
  return true;
}
