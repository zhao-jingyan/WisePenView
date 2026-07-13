import { aiChangePlugin } from './AiChangePlugin';
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
import { aiDiffRuntimeExtension } from './runtime/aiDiff';
import type { NotePluginBundle } from './types';

const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [defaultContentPlugin, codeBlockPlugin, tablePlugin, latexPlugin, aiChangePlugin],
} satisfies NotePluginBundle;

export const notePluginRegistry = createNotePluginRegistry(notePluginTree, [
  commonRuntimeExtension,
  aiDiffRuntimeExtension,
]);

export { isCommentableSelection, shouldHideNoteFormattingToolbar } from './commentsPolicy';
export { exportNoteFullHtml, exportNoteMarkdown } from './markdownExport';
export { importNoteMarkdown } from './markdownImport';
export { hasAiDiffContentFromEditor } from './runtime/aiDiff/presence';
export {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNoteReadOnlyFilterExtension,
};
