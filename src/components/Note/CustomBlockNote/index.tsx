import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { useLatest, useMount, useUnmount } from 'ahooks';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { useImageService } from '@/contexts/ServicesContext';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { useNoteCaptureKeyEvent } from './useNoteCaptureKeyEvent';
import { buildNoteSlashMenuItems } from './slashMenuConfig';
import { blockNoteSchema, type CustomBlockNoteEditor } from './blockNoteSchema';
import { inlineMathDollarExtension } from './LatexSupport/inlineMathDollarExtension';
import { stripEscapeCharExtension, stripEscapeEditorProps } from './stripEscapeCharExtension';
import styles from './style.module.less';

/** 笔记正文在 Y.Doc 中的 XmlFragment 名；需与后端 observeDeep 及 BlockNote 绑定名一致 */
const NOTE_YJS_DOCUMENT_FRAGMENT = 'document-store' as const;

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type EditorSelection = ReturnType<CustomBlockNoteEditor['getSelection']>;

function readInsertedBlockId(insertedBlock: unknown): string | undefined {
  if (
    typeof insertedBlock === 'object' &&
    insertedBlock !== null &&
    'id' in insertedBlock &&
    typeof (insertedBlock as { id: unknown }).id === 'string'
  ) {
    return (insertedBlock as { id: string }).id;
  }
  return undefined;
}

function getSelectionSignature(selection: EditorSelection): string {
  if (!selection) {
    return '';
  }
  return selection.blocks
    .map((block) => block.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .join(',');
}

const CustomBlockNote = forwardRef<NoteBodyEditorHandle, CustomBlockNoteProps>(
  ({ resourceId, doc, provider, readOnly = false }, ref) => {
    const imageService = useImageService();
    const editorRef = useLatest<CustomBlockNoteEditor | null>(null);
    const [selectionState, setSelectionState] = useState<EditorSelection>(undefined);
    const selectionSignatureRef = useRef<string>('');
    const onChangeCleanupRef = useRef<(() => void) | null>(null);
    const selectionSyncRef = useRef<(() => void) | null>(null);

    const uploadFile = useCallback(
      async (file: File, insertedBlock: unknown) => {
        // 只拦截图片：非图片文件让 BlockNote 走默认行为（或抛错以阻止插入）
        if (!file.type.startsWith('image/')) {
          throw new Error('仅支持插入图片文件');
        }
        // 优先本机立刻可见 + 尽快换成公网 URL
        const blockId = readInsertedBlockId(insertedBlock);
        const previewUrl = URL.createObjectURL(file);

        void (async () => {
          try {
            const { publicUrl } = await imageService.uploadImage({
              file,
              scene: 'PRIVATE_IMAGE_FOR_NOTE',
              bizTag: `notes/${resourceId}`,
            });
            const currentEd = editorRef.current;
            if (!currentEd || blockId === undefined) {
              return;
            }
            const block = currentEd.getBlock(blockId);
            if (!block || block.type !== 'image') {
              return;
            }
            currentEd.updateBlock(block, {
              props: { ...block.props, url: publicUrl },
            });
            queueMicrotask(() => {
              URL.revokeObjectURL(previewUrl);
            });
          } catch {
            // 上传失败时保留 blob 预览，避免立刻空白；刷新后仍会丢图，可后续接 Toast / 重试
          }
        })();

        return previewUrl;
      },
      [imageService, resourceId, editorRef]
    );

    const editor = useCreateBlockNote({
      schema: blockNoteSchema,
      dictionary: zh,
      trailingBlock: true,
      uploadFile,
      extensions: [stripEscapeCharExtension, inlineMathDollarExtension()],
      _tiptapOptions: {
        editorProps: stripEscapeEditorProps,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: doc.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT),
        user: {
          // 单人模式下使用固定身份，避免业务层传 userId/color
          name: '',
          color: '#4096ff',
        },
      },
    });

    useMount(() => {
      console.log('useMount');
      editorRef.current = editor;
      const syncSelectionState = () => {
        const currentEditor = editorRef.current;
        if (!currentEditor) {
          return;
        }
        const currentSelection = currentEditor.getSelection();
        if (currentSelection) {
          console.log('Selected blocks:', currentSelection.blocks.length);
        }
        const nextSignature = getSelectionSignature(currentSelection);
        if (nextSignature === selectionSignatureRef.current) {
          return;
        }
        selectionSignatureRef.current = nextSignature;
        setSelectionState(currentSelection);
      };

      syncSelectionState();
      selectionSyncRef.current = syncSelectionState;
      onChangeCleanupRef.current = editor.onChange(syncSelectionState);
      document.addEventListener('selectionchange', syncSelectionState);
    });
    useUnmount(() => {
      if (onChangeCleanupRef.current) {
        onChangeCleanupRef.current();
        onChangeCleanupRef.current = null;
      }
      selectionSignatureRef.current = '';
      if (selectionSyncRef.current) {
        document.removeEventListener('selectionchange', selectionSyncRef.current);
        selectionSyncRef.current = null;
      }
      editorRef.current = null;
    });

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor.focus();
        },
      }),
      [editor]
    );

    const onKeyDownCapture = useNoteCaptureKeyEvent(provider);

    return (
      <div
        className={styles.editorShell}
        onKeyDownCapture={onKeyDownCapture}
        data-selected-block-count={selectionState?.blocks.length ?? 0}
      >
        <BlockNoteView editor={editor} theme="light" slashMenu={false} editable={!readOnly}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              return filterSuggestionItems(buildNoteSlashMenuItems(editor), query);
            }}
          />
        </BlockNoteView>
      </div>
    );
  }
);

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
