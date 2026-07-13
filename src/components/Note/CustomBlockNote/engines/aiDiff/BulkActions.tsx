import { createPortal } from 'react-dom';
import type * as Y from 'yjs';

import type { NoteAiDiffAction, NotePluginRegistry } from '../../content/types';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';
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
      <button
        type="button"
        aria-label="保留全部 AI 修改"
        className={`${styles.actionButton} ${styles.accept}`}
        onMouseDown={preventEditorInteraction}
        onClick={(event) => {
          preventEditorInteraction(event);
          apply('accept');
        }}
      >
        全部保留
      </button>
      <button
        type="button"
        aria-label="撤销全部 AI 修改"
        className={`${styles.actionButton} ${styles.discard}`}
        onMouseDown={preventEditorInteraction}
        onClick={(event) => {
          preventEditorInteraction(event);
          apply('discard');
        }}
      >
        全部撤销
      </button>
    </div>,
    portalContainer
  );
}
