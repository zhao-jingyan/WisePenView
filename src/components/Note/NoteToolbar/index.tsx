import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { shouldHideFormattingToolbarForMathBlock } from '@/components/Note/CustomBlockNote/comments/core/isCommentableSelection';
import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import {
  blockMatchesBlockTypeItem,
  getAvailableBlockTypeItems,
} from '@/components/Note/NoteEditorMenus/blockTypes';
import {
  useTableRailSelectionState,
  type TableRailSelectionOrientation,
} from '@/components/Note/NoteTableHandles/railSelectionState';
import { blockHasType } from '@blocknote/core';
import { FormattingToolbarExtension } from '@blocknote/core/extensions';
import {
  GenericPopover,
  useBlockNoteEditor,
  useEditorState,
  useExtension,
  useExtensionState,
  type GenericPopoverReference,
} from '@blocknote/react';
import { ButtonGroup, Separator, Toolbar } from '@heroui/react';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { useMemo, type ComponentProps } from 'react';
import { BlockTypeMenu } from './components/BlockTypeMenu';
import { ColorMenu } from './components/ColorMenu';
import { FileCaptionToolbarButton } from './components/FileButtons';
import { CreateLinkToolbarButton } from './components/LinkButton';
import { NestButtons } from './components/NestButtons';
import { TableCellButtons } from './components/TableCellButtons';
import { TextAlignButtons } from './components/TextAlignButtons';
import { TextStyleButtons } from './components/TextStyleButtons';
import { ToolbarButton } from './components/ToolbarButton';
import type { NoteToolbarProps } from './index.type';
import styles from './style.module.less';
import { useFloatingToolbarState } from './useFloatingToolbarState';
import { getSelectedBlocks, stopToolbarMouseDown } from './utils';

const getTableRailToolbarPlacement = (
  orientation: TableRailSelectionOrientation
): 'top' | 'right' => (orientation === 'column' ? 'top' : 'right');

const toDOMRect = (rect: { height: number; width: number; x: number; y: number }) =>
  new DOMRect(rect.x, rect.y, rect.width, rect.height);

function ToolbarSeparator() {
  return <Separator orientation="vertical" className={styles.toolbarSeparator} />;
}

function useBlockTypeFileGroupVisible() {
  const editor = useBlockNoteEditor(blockNoteSchema);

  return useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return false;
      }

      const selectedBlocks = getSelectedBlocks(editor);
      const firstBlock = selectedBlocks[0];
      const { primaryItems, headingItems } = getAvailableBlockTypeItems(editor);
      const blockTypeVisible = [...primaryItems, ...headingItems].some((item) =>
        blockMatchesBlockTypeItem(firstBlock, item)
      );
      const fileCaptionVisible =
        selectedBlocks.length === 1 &&
        blockHasType(selectedBlocks[0], editor, selectedBlocks[0].type, {
          caption: 'string',
          url: 'string',
        });

      return blockTypeVisible || fileCaptionVisible;
    },
  });
}

function CustomFormattingToolbar({
  onAskAi,
  showAddComment = false,
  onRememberPendingCommentReference,
}: NoteToolbarProps) {
  const readOnly = useNoteEditorReadOnlyContext();
  const editor = useBlockNoteEditor();
  const showBlockTypeFileGroup = useBlockTypeFileGroupVisible();
  const commentsExtension = editor.getExtension('comments') as
    { startPendingComment?: () => void } | undefined;

  return (
    <Toolbar
      aria-label="格式工具栏"
      isAttached
      className={styles.toolbar}
      onMouseDown={stopToolbarMouseDown}
    >
      {!readOnly ? (
        <>
          <TableCellButtons />
          {showBlockTypeFileGroup ? (
            <>
              <ToolbarSeparator />
              <ButtonGroup size="sm" variant="ghost" aria-label="块类型和文件">
                <BlockTypeMenu />
                <FileCaptionToolbarButton />
              </ButtonGroup>
            </>
          ) : null}
          <ToolbarSeparator />
          <TextStyleButtons />
          <ToolbarSeparator />
          <TextAlignButtons />
          <ToolbarSeparator />
          <ColorMenu />
          <ToolbarSeparator />
          <NestButtons />
          <ToolbarSeparator />
          <CreateLinkToolbarButton />
          <ToolbarSeparator />
        </>
      ) : null}
      <ButtonGroup size="sm" variant="ghost" aria-label="批注和 AI">
        {showAddComment && commentsExtension?.startPendingComment ? (
          <ToolbarButton
            label="添加批注"
            icon={<MessageSquarePlus size={20} />}
            onMouseDownCapture={onRememberPendingCommentReference}
            onPress={() => commentsExtension.startPendingComment?.()}
          />
        ) : null}
        <ToolbarButton label="问 AI" icon={<Sparkles size={20} />} onPress={onAskAi} />
      </ButtonGroup>
    </Toolbar>
  );
}

type TextSelectionFormattingToolbarProps = NoteToolbarProps & {
  hidden: boolean;
};

function TextSelectionFormattingToolbar({
  hidden,
  ...toolbarProps
}: TextSelectionFormattingToolbarProps) {
  const editor = useBlockNoteEditor();
  const toolbarState = useFloatingToolbarState(editor);

  if (hidden || !toolbarState.visible || shouldHideFormattingToolbarForMathBlock(editor)) {
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
      <CustomFormattingToolbar {...toolbarProps} />
    </div>
  );
}

type TableRailFormattingToolbarProps = NoteToolbarProps & {
  tableRailSelection: ReturnType<typeof useTableRailSelectionState>;
};

function TableRailFormattingToolbar({
  tableRailSelection,
  ...toolbarProps
}: TableRailFormattingToolbarProps) {
  const editor = useBlockNoteEditor();
  const formattingToolbar = useExtension(FormattingToolbarExtension, { editor });
  const show = useExtensionState(FormattingToolbarExtension, { editor });
  const reference = useMemo<GenericPopoverReference | undefined>(() => {
    if (!tableRailSelection.rect) {
      return undefined;
    }
    const element = editor.domElement?.firstElementChild ?? undefined;
    const getBoundingClientRect = () => toDOMRect(tableRailSelection.rect!);

    return element
      ? { element, getBoundingClientRect, cacheMountedBoundingClientRect: false }
      : { element: undefined, getBoundingClientRect };
  }, [editor.domElement, tableRailSelection.rect]);
  const useFloatingOptions = useMemo<ComponentProps<typeof GenericPopover>['useFloatingOptions']>(
    () => ({
      onOpenChange: (open, _event, reason) => {
        formattingToolbar.store.setState(open);
        if (reason === 'escape-key') {
          editor.focus();
        }
      },
      open: show,
      placement:
        tableRailSelection.orientation === null
          ? 'top'
          : getTableRailToolbarPlacement(tableRailSelection.orientation),
    }),
    [editor, formattingToolbar.store, show, tableRailSelection.orientation]
  );

  if (!tableRailSelection.orientation || !reference) {
    return null;
  }

  return (
    <GenericPopover
      reference={reference}
      useFloatingOptions={useFloatingOptions}
      focusManagerProps={{ disabled: true }}
      elementProps={{ className: styles.floatingLayer, style: { zIndex: 120 } }}
    >
      {show ? <CustomFormattingToolbar {...toolbarProps} /> : null}
    </GenericPopover>
  );
}

function NoteToolbar(props: NoteToolbarProps) {
  const tableRailSelection = useTableRailSelectionState();

  return (
    <>
      <TextSelectionFormattingToolbar {...props} hidden={tableRailSelection.orientation !== null} />
      <TableRailFormattingToolbar {...props} tableRailSelection={tableRailSelection} />
    </>
  );
}

export default NoteToolbar;
