import { aiDiffPlugin, aiDiffRuntimeExtension } from './AIDiffPlugin';
import { codeBlockPlugin } from './CodeBlockPlugin';
import { commonRuntimeExtension } from './CommonPlugin';
import { defaultContentPlugin } from './DefaultContentPlugin';
import { latexPlugin } from './LatexPlugin';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
  createNoteReadOnlyFilterExtension,
} from './registry';
import type { NotePluginBundle } from './types';

export const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [defaultContentPlugin, codeBlockPlugin, latexPlugin, aiDiffPlugin],
} satisfies NotePluginBundle;

export const notePluginRegistry = createNotePluginRegistry(notePluginTree, [
  commonRuntimeExtension,
  aiDiffRuntimeExtension,
]);

export {
  exportNoteFullHtml,
  exportNoteMarkdown,
  projectNoteBlocksForMarkdown,
} from './markdownExport';
export { importNoteMarkdown } from './markdownImport';
export { hasAiDiffContentFromEditor, hasAiDiffInBlock } from './presence';
export type {
  NoteBlockPlugin,
  NoteContentPlugin,
  NoteInlinePlugin,
  NotePluginBundle,
  NotePluginNode,
  NotePluginRegistry,
  NoteRuntimeExtension,
} from './types';
export {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
  createNoteReadOnlyFilterExtension,
};
