import type { CustomBlockNoteEditor } from '../CustomBlockNote/blockNoteSchema';
import type { NoteEditorPlugin } from '../CustomBlockNote/plugins/types';

export interface NoteSlashMenuProps {
  editor: CustomBlockNoteEditor;
  plugins: readonly NoteEditorPlugin[];
}
