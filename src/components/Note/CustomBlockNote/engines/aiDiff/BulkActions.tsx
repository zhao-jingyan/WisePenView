import { Button, ButtonGroup } from '@heroui/react';
import { createPortal } from 'react-dom';
import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NoteAiDiffAction, NotePluginRegistry } from '../../registry/types';
import { applyAllNoteAiDiffActions } from './action';
import styles from './style.module.less';

interface AiDiffBulkActionsProps {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  undoManager: Y.UndoManager;
  visible: boolean;
  portalContainer: HTMLElement | null;
}

export function AiDiffBulkActions({
  doc,
  editor,
  registry,
  undoManager,
  visible,
  portalContainer,
}: AiDiffBulkActionsProps) {
  if (!visible || !portalContainer) return null;

  const apply = (action: NoteAiDiffAction) => {
    undoManager.stopCapturing();
    applyAllNoteAiDiffActions({ doc, editor, registry, action });
    undoManager.stopCapturing();
  };
  const preventEditorInteraction = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <div className={styles.bulkActions} contentEditable={false}>
      <ButtonGroup size="sm" aria-label="全部 AI Diff 操作">
        <Button
          variant="secondary"
          aria-label="撤销全部 AI 修改"
          onMouseDown={preventEditorInteraction}
          onPress={() => apply('discard')}
        >
          全部撤销
        </Button>
        <Button
          variant="primary"
          aria-label="保留全部 AI 修改"
          onMouseDown={preventEditorInteraction}
          onPress={() => apply('accept')}
        >
          全部保留
        </Button>
      </ButtonGroup>
    </div>,
    portalContainer
  );
}
