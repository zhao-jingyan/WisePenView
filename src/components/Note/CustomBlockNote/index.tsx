import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { useMount, useUnmount } from 'ahooks';
import '@blocknote/mantine/style.css';

import { useImageService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { assertImageProxyUploadLimit } from '@/services/Image';
import {
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewNoteStore,
  useNoteSelectionStore,
} from '@/store';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import { blockNoteSchema } from './blockNoteSchema';
import NoteToolbar from '../NoteToolbar';
import NoteSlashMenu from '../NoteSlashMenu';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  getNoteEditorPlugins,
} from './plugins';
import { useAttachNoteYjsUndoStack, useNoteCaptureKeyEvent, useNoteYjsUndoManager } from './hooks';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type UnknownInlineContent = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

type FlatBlockSnapshot = {
  id: string;
  type: string;
};

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

function buildOutlineItemsFromEditor<
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

function buildFlatBlocksFromEditor<
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

function resolveActiveHeadingId(flat: FlatBlockSnapshot[], currentId: string): string | undefined {
  const idx = flat.findIndex((b) => b.id === currentId);
  if (idx < 0) return undefined;
  for (let i = idx; i >= 0; i -= 1) {
    if (flat[i]?.type === 'heading') {
      return flat[i]?.id;
    }
  }
  return undefined;
}

const CustomBlockNote = forwardRef<NoteBodyEditorHandle, CustomBlockNoteProps>(
  (
    { resourceId, doc, provider, readOnly = false, onOutlineChange, onActiveHeadingChange },
    ref
  ) => {
    const imageService = useImageService();
    const message = useAppMessage();
    const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
    const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
    const setSelectedText = useNoteSelectionStore((state) => state.setSelectedText);
    const setEnableSelectedText = useNoteSelectionStore((state) => state.setEnableSelectedText);
    const selectedText = useNoteSelectionStore(
      (state) => state.selectedTextByResourceId[resourceId] ?? ''
    );
    const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);
    const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
    const flatBlocksRef = useRef<{ id: string; type: string }[]>([]);
    const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

    const plugins = useMemo(() => getNoteEditorPlugins(), []);
    const editorExtensions = useMemo(() => collectNoteEditorExtensions(plugins), [plugins]);
    const editorProps = useMemo(() => collectNoteEditorProps(plugins), [plugins]);

    const uploadFile = useCallback(
      async (file: File) => {
        // 只拦截图片：非图片文件让 BlockNote 走默认行为（或抛错以阻止插入）
        if (!file.type.startsWith('image/')) {
          throw new Error('仅支持插入图片文件');
        }
        try {
          assertImageProxyUploadLimit(file);
        } catch (error) {
          const text = error instanceof Error ? error.message : '图片上传失败';
          message.error(text);
          throw error;
        }
        const { publicUrl } = await imageService.uploadImage({
          file,
          scene: 'PRIVATE_IMAGE_FOR_NOTE',
          bizTag: `notes/${resourceId}`,
        });
        return publicUrl;
      },
      [imageService, message, resourceId]
    );

    const editor = useCreateBlockNote({
      schema: blockNoteSchema,
      dictionary: zh,
      trailingBlock: true,
      disableExtensions: ['history', 'yUndo'],
      uploadFile,
      extensions: editorExtensions,
      _tiptapOptions: {
        editorProps,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: noteFragment,
        user: {
          // 单人模式下使用固定身份，避免业务层传 userId/color
          name: '',
          color: '#4096ff',
        },
      },
    });

    const syncSelectedText = useCallback(() => {
      setSelectedText(resourceId, editor.getSelectedText());
    }, [editor, resourceId, setSelectedText]);

    useAttachNoteYjsUndoStack(doc, editor, undoManager);

    useMount(() => {
      syncSelectedText();
    });

    useMount(() => {
      newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
        const isNoteEmpty = editor.blocksToMarkdownLossy().trim().length === 0;
        useNewNoteStore.getState().syncNewNoteBodyFromEditor(resourceId, isNoteEmpty);

        const needOutline = Boolean(onOutlineChange);
        const needFlatBlocks = Boolean(onActiveHeadingChange);
        if (needOutline || needFlatBlocks) {
          const items = needOutline ? buildOutlineItemsFromEditor(editor) : [];
          const flat = needFlatBlocks ? buildFlatBlocksFromEditor(editor) : [];
          if (needFlatBlocks) {
            flatBlocksRef.current = flat;
          }
          if (needOutline) {
            onOutlineChange?.(items);
          }
        }
      });
    });

    useUnmount(() => {
      if (newNoteBodyOnChangeCleanupRef.current) {
        newNoteBodyOnChangeCleanupRef.current();
        newNoteBodyOnChangeCleanupRef.current = null;
      }
      clearSelectedText(resourceId);
    });

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor.focus();
        },
        navigateToBlock: (id: string) => {
          try {
            editor.setTextCursorPosition(id, 'start');
            editor.focus();
            // 再次触发 scrollIntoView，避免未滚动到可视区域
            const view = (
              editor as unknown as {
                prosemirrorView?: { state?: { tr?: unknown }; dispatch?: unknown };
              }
            ).prosemirrorView;
            const canScroll =
              typeof view?.dispatch === 'function' &&
              view?.state &&
              isRecord(view.state) &&
              'tr' in view.state &&
              isRecord(view.state.tr) &&
              typeof (view.state.tr as { scrollIntoView?: unknown }).scrollIntoView === 'function';
            if (canScroll) {
              window.requestAnimationFrame(() => {
                try {
                  (view.dispatch as (tr: unknown) => void)(
                    (view.state as { tr: { scrollIntoView: () => unknown } }).tr.scrollIntoView()
                  );
                } catch {
                  void 0;
                }
              });
            }
          } catch {
            editor.focus();
          }
        },
      }),
      [editor]
    );

    const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });
    const syncActiveHeading = useCallback(() => {
      if (!onActiveHeadingChange) {
        return;
      }
      let activeId: string | undefined;
      try {
        const cursor = editor.getTextCursorPosition();
        const currentId = cursor.block?.id;
        if (!currentId) {
          onActiveHeadingChange(undefined);
          return;
        }
        const flat = flatBlocksRef.current;
        activeId = resolveActiveHeadingId(flat, currentId);
      } catch {
        activeId = undefined;
      }
      onActiveHeadingChange(activeId);
    }, [editor, onActiveHeadingChange]);

    const handleSelectionChange = useCallback(() => {
      syncSelectedText();
      syncActiveHeading();
    }, [syncActiveHeading, syncSelectedText]);

    const handleAskAi = useCallback(() => {
      if (!currentSessionId) {
        return;
      }
      const selectedSnapshot = editor.getSelectedText().trim() || selectedText.trim();
      if (!selectedSnapshot) {
        return;
      }
      setSelectedText(currentSessionId, selectedSnapshot);
      setEnableSelectedText(currentSessionId, true);
      setChatPanelCollapsed(false);
    }, [
      currentSessionId,
      editor,
      selectedText,
      setChatPanelCollapsed,
      setEnableSelectedText,
      setSelectedText,
    ]);

    return (
      <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
        <BlockNoteView
          editor={editor}
          theme="light"
          formattingToolbar={false}
          slashMenu={false}
          editable={!readOnly}
          onSelectionChange={handleSelectionChange}
        >
          <NoteToolbar onAskAi={handleAskAi} />
          <NoteSlashMenu editor={editor} plugins={plugins} />
        </BlockNoteView>
      </div>
    );
  }
);

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
