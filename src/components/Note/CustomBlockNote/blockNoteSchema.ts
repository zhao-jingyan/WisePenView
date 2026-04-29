import { createNoteBlockNoteSchema, getNoteEditorPlugins } from './plugins';

/**
 * 笔记正文编辑器 schema：合并各插件贡献的 blockSpecs / inlineContentSpecs。
 * 新增插件：在 `plugins/index.ts` 的 `NOTE_EDITOR_PLUGINS` 中追加即可。
 */
export const blockNoteSchema = createNoteBlockNoteSchema(getNoteEditorPlugins());

export type CustomBlockNoteSchema = typeof blockNoteSchema;

/** 带各插件块的编辑器类型，供 slash 菜单与插入 API 使用 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export type CustomBlockNotePartialBlock = typeof blockNoteSchema.PartialBlock;
