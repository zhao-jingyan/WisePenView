import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  SuggestionMenuController,
  TextAlignButton,
  UnnestBlockButton,
  useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { useMount, useUnmount } from 'ahooks';
import { Button } from 'antd';
import { RiSparklingLine } from 'react-icons/ri';
import '@blocknote/mantine/style.css';

import { useImageService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { assertImageProxyUploadLimit } from '@/services/Image';
import { useChatPanelStore, useCurrentChatSessionStore, useNoteSelectionStore } from '@/store';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import { useNoteCaptureKeyEvent } from './useNoteCaptureKeyEvent';
import { useAttachNoteYjsUndoStack, useNoteYjsUndoManager } from './useNoteYjsUndoStack';
import { buildNoteSlashMenuItems } from './slashMenuConfig';
import { blockNoteSchema } from './blockNoteSchema';
import { inlineMathDollarExtension } from './LatexSupport/inlineMathDollarExtension';
import { stripEscapeCharExtension, stripEscapeEditorProps } from './stripEscapeCharExtension';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

const CustomBlockNote = forwardRef<NoteBodyEditorHandle, CustomBlockNoteProps>(
  ({ resourceId, doc, provider, readOnly = false }, ref) => {
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
    const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

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
      extensions: [stripEscapeCharExtension, inlineMathDollarExtension()],
      _tiptapOptions: {
        editorProps: stripEscapeEditorProps,
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

    useUnmount(() => {
      clearSelectedText(resourceId);
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

    const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });
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
          onSelectionChange={syncSelectedText}
        >
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar>
                <Button
                  type="primary"
                  size="small"
                  icon={<RiSparklingLine size={14} />}
                  className={styles.askAiBtn}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAskAi();
                  }}
                >
                  问AI
                </Button>
                <BlockTypeSelect key="blockTypeSelect" />
                <FileCaptionButton key="fileCaptionButton" />
                <FileReplaceButton key="replaceFileButton" />
                <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
                <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
                <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
                <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
                <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
                <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
                <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
                <TextAlignButton textAlignment="right" key="textAlignRightButton" />
                <ColorStyleButton key="colorStyleButton" />
                <NestBlockButton key="nestBlockButton" />
                <UnnestBlockButton key="unnestBlockButton" />
                <CreateLinkButton key="createLinkButton" />
              </FormattingToolbar>
            )}
          />
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
