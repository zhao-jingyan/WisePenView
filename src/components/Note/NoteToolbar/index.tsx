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
  TextAlignButton,
  UnnestBlockButton,
} from '@blocknote/react';

import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';

const NoteToolbar = () => {
  const readOnly = useNoteEditorReadOnlyContext();

  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
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
      )}
    />
  );
};

export default NoteToolbar;
