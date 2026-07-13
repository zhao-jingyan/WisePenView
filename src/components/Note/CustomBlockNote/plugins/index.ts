import { aiDiffPlugin, aiDiffRuntimeExtension } from './AIDiffPlugin';
import { codeBlockPlugin } from './CodeBlockPlugin';
import { commonRuntimeExtension } from './CommonPlugin';
import { defaultContentPlugin } from './DefaultContentPlugin';
import { latexPlugin } from './LatexPlugin';
import { tablePlugin } from './TablePlugin';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
  createNoteReadOnlyFilterExtension,
} from './registry';
import type { NotePluginBundle } from './types';

const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [defaultContentPlugin, codeBlockPlugin, tablePlugin, latexPlugin, aiDiffPlugin],
} satisfies NotePluginBundle;

export const notePluginRegistry = createNotePluginRegistry(notePluginTree, [
  commonRuntimeExtension,
  aiDiffRuntimeExtension,
]);

export { isCommentableSelection, shouldHideNoteFormattingToolbar } from './commentsPolicy';
export { exportNoteFullHtml, exportNoteMarkdown } from './markdownExport';
export { importNoteMarkdown } from './markdownImport';
export { hasAiDiffContentFromEditor } from './presence';
export {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNoteReadOnlyFilterExtension,
};
