import { createPortal } from 'react-dom';

import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import type { NoteAiDiffAction, NotePluginRegistry } from '../../types';
import { applyAllNoteAiDiffActions } from './applyAll';
import styles from './style.module.less';

interface AiDiffBulkActionsProps {
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  visible: boolean;
  portalContainer: HTMLElement | null;
  onApplied: () => void;
}

export function AiDiffBulkActions({
  editor,
  registry,
  visible,
  portalContainer,
  onApplied,
}: AiDiffBulkActionsProps) {
  if (!visible || !portalContainer) return null;

  const apply = (action: NoteAiDiffAction) => {
    applyAllNoteAiDiffActions(editor, registry, action);
    onApplied();
  };
  const preventEditorInteraction = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <div className={styles.aiBulkActions} contentEditable={false}>
      <button
        type="button"
        aria-label="Keep all AI changes"
        className={`${styles.aiActionBtn} ${styles.aiActionAccept} ${styles.aiBulkActionBtn}`}
        onMouseDown={preventEditorInteraction}
        onClick={(event) => {
          preventEditorInteraction(event);
          apply('accept');
        }}
      >
        Keep all
      </button>
      <button
        type="button"
        aria-label="Undo all AI changes"
        className={`${styles.aiActionBtn} ${styles.aiActionDiscard} ${styles.aiBulkActionBtn}`}
        onMouseDown={preventEditorInteraction}
        onClick={(event) => {
          preventEditorInteraction(event);
          apply('discard');
        }}
      >
        Undo all
      </button>
    </div>,
    portalContainer
  );
}
