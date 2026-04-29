import { commonPlugin } from './CommonPlugin';
import { latexPlugin } from './LatexPlugin';
import type { NoteEditorPlugin } from './types';

/**
 * 笔记正文编辑器的内置插件。顺序即 schema/extension/editorProps/slash 的贡献顺序，
 * 通用能力（commonPlugin）在前，业务块（latexPlugin 等）在后。
 */
export const NOTE_EDITOR_PLUGINS: readonly NoteEditorPlugin[] = [commonPlugin, latexPlugin];

export function getNoteEditorPlugins(): readonly NoteEditorPlugin[] {
  return NOTE_EDITOR_PLUGINS;
}

export type { NoteEditorPlugin } from './types';
export {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createNoteBlockNoteSchema,
} from './registry';
