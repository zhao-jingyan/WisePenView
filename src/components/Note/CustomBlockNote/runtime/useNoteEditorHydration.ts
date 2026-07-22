import { usePendingNoteImportStore } from '@/components/Note/_store/usePendingNoteImportStore';
import type { NoteAiDiffPreviewData } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUpdateEffect } from 'ahooks';
import type * as Y from 'yjs';

import { getAiContentStore } from '../engines/aiDiff/store';
import { importNoteMarkdown } from '../engines/markdown/markdownImport';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../registry/noteEditorComposition';

const initializedAiDiffPreviews = new WeakMap<Y.Doc, NoteAiDiffPreviewData>();

function splitAiDiffPreviewBlocks(
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
      children: splitAiDiffPreviewBlocks(children, aiContentByBlockId),
    };
  });
}

/** 将预览快照一次性写入正文和 AI sidecar。 */
function initializeAiDiffPreview(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  preview: NoteAiDiffPreviewData;
}): boolean {
  const { doc, editor, preview } = params;
  if (initializedAiDiffPreviews.get(doc) === preview) return false;

  const aiContentByBlockId = new Map<string, unknown>();
  const blocks = splitAiDiffPreviewBlocks(preview.content, aiContentByBlockId) as Parameters<
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
  initializedAiDiffPreviews.set(doc, preview);
  return true;
}

export function useNoteEditorHydration({
  editor,
  doc,
  undoManager,
  resourceId,
  collaborationReady,
  aiDiffPreview,
  scheduleBodyContentHashRefresh,
}: {
  editor: CustomBlockNoteEditor;
  doc: CustomBlockNoteProps['collaboration']['doc'];
  undoManager: Y.UndoManager;
  resourceId: string;
  collaborationReady: boolean;
  aiDiffPreview: CustomBlockNoteProps['aiDiffPreview'];
  scheduleBodyContentHashRefresh: () => void;
}) {
  const applyPendingMarkdownImport = useMemoizedFn(() => {
    if (!collaborationReady) {
      return;
    }

    const pendingImport = usePendingNoteImportStore.getState().pendingByResourceId[resourceId];
    if (!pendingImport) {
      return;
    }

    try {
      const blocks = importNoteMarkdown(editor, notePluginRegistry, pendingImport.markdown);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.success(`已导入 ${pendingImport.sourceFileName}`);
    } catch (error) {
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.danger(`Markdown 导入失败：${parseErrorMessage(error)}`);
    }
  });

  useMount(() => {
    applyPendingMarkdownImport();
  });

  useUpdateEffect(() => {
    applyPendingMarkdownImport();
  }, [collaborationReady, resourceId]);

  const applyAiDiffPreview = useMemoizedFn(() => {
    if (!collaborationReady || !aiDiffPreview) return;
    if (initializeAiDiffPreview({ doc, editor, preview: aiDiffPreview })) {
      undoManager.clear();
      scheduleBodyContentHashRefresh();
    }
  });

  useMount(() => {
    applyAiDiffPreview();
  });

  useUpdateEffect(() => {
    applyAiDiffPreview();
  }, [aiDiffPreview, collaborationReady, resourceId]);
}
