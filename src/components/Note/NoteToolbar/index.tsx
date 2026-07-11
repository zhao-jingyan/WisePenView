import {
  AddCommentButton,
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
  useBlockNoteEditor,
} from '@blocknote/react';
import { Button } from '@heroui/react';
import { Sparkles } from 'lucide-react';

import { shouldHideFormattingToolbarForMathBlock } from '@/components/Note/CustomBlockNote/comments/core/isCommentableSelection';
import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import type { NoteToolbarProps } from './index.type';
import styles from './style.module.less';
import { useFloatingToolbarState } from './useFloatingToolbarState';

function NoteToolbar({
  onAskAi,
  showAddComment = false,
  onRememberPendingCommentReference,
}: NoteToolbarProps) {
  const readOnly = useNoteEditorReadOnlyContext();
  const editor = useBlockNoteEditor();
  const toolbarState = useFloatingToolbarState(editor);

  if (!toolbarState.visible || shouldHideFormattingToolbarForMathBlock(editor)) {
    return null;
  }

  return (
    <div
      className={styles.toolbarPopover}
      style={{
        left: toolbarState.left,
        top: toolbarState.top,
      }}
    >
      <FormattingToolbar>
        <Button
          variant="primary"
          size="sm"
          className={styles.askAiBtn}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPress={onAskAi}
        >
          <Sparkles size={14} aria-hidden="true" />问 AI
        </Button>
        {showAddComment ? (
          <span onMouseDownCapture={onRememberPendingCommentReference}>
            <AddCommentButton key="addCommentButton" />
          </span>
        ) : null}
        {!readOnly ? (
          <>
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
          </>
        ) : null}
      </FormattingToolbar>
    </div>
  );
}

export default NoteToolbar;
