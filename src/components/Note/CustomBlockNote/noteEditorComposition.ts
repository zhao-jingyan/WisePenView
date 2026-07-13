import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
} from './content/registry';
import type { NotePluginBundle } from './content/types';
import { aiDiffRuntimeExtension } from './engines/aiDiff/runtime';
import { editorRuntimeExtension } from './engines/editor/stripEscape';
import { codeBlockPlugin } from './plugins/CodeBlockPlugin';
import { defaultContentPlugin } from './plugins/DefaultContentPlugin';
import { latexPlugin } from './plugins/LatexPlugin';
import { tablePlugin } from './plugins/TablePlugin';

const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [defaultContentPlugin, codeBlockPlugin, tablePlugin, latexPlugin],
} satisfies NotePluginBundle;

export const notePluginRegistry = createNotePluginRegistry(notePluginTree, [
  editorRuntimeExtension,
  aiDiffRuntimeExtension,
]);

/** 笔记正文 schema 由唯一的内容插件树生成。 */
export const blockNoteSchema = createNoteBlockNoteSchema(notePluginRegistry);

/** 带所有内容 owner 的编辑器类型。 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export { collectNoteEditorExtensions, collectNoteEditorProps, createDefaultNoteBlock };
