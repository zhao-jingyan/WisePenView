import { BlockNoteView } from '@blocknote/mantine';

import { useAppTheme } from '@/theme';

import { AiDiffBulkActions } from '../engines/aiDiff/BulkActions';
import { NoteEditorReadOnlyProvider } from '../engines/editor/readOnly';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteEditorRuntimeCoordinator } from '../registry/useNoteEditorRuntimeCoordinator';
import styles from '../style.module.less';
import NoteSideMenu from './sideMenu';
import NoteSlashMenu from './slashMenu';
import NoteTableHandles from './tableHandles';
import NoteToolbar from './toolbar';

export function NoteEditorSurface({
  editor,
  runtimeCoordinator,
  props,
}: {
  editor: CustomBlockNoteEditor;
  runtimeCoordinator: NoteEditorRuntimeCoordinator;
  props: CustomBlockNoteProps;
}) {
  const { resolvedTheme } = useAppTheme();
  const {
    collaboration: { doc },
    state: { readOnly },
    portalContainers: { aiBulkActions: aiBulkActionsPortalContainer },
    onOpenFind,
    isFindModeActive,
  } = props;

  return (
    <div
      className={styles.editorShell}
      onKeyDownCapture={runtimeCoordinator.collaboration.onKeyDownCapture}
    >
      <AiDiffBulkActions
        doc={doc}
        editor={editor}
        registry={notePluginRegistry}
        undoManager={runtimeCoordinator.collaboration.undoManager}
        visible={runtimeCoordinator.aiDiff.showBulkActions}
        portalContainer={aiBulkActionsPortalContainer}
      />
      <NoteEditorReadOnlyProvider value={readOnly}>
        <BlockNoteView
          className="bodyBlockNoteView"
          editor={editor}
          theme={resolvedTheme}
          formattingToolbar={false}
          slashMenu={false}
          sideMenu={false}
          tableHandles={false}
          editable={!readOnly}
          onSelectionChange={runtimeCoordinator.handleSelectionChange}
        >
          <NoteToolbar
            onAskAi={runtimeCoordinator.document.handleAskAi}
            onAddComment={runtimeCoordinator.inlineComments.handleCreate}
            onOpenFind={onOpenFind}
            isFindModeActive={isFindModeActive}
          />
          <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
          <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
          <NoteTableHandles />
        </BlockNoteView>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}
