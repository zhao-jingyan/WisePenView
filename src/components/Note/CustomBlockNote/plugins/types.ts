import type {
  BlockNoteEditor,
  BlockSchema,
  BlockSpecs,
  ExtensionFactoryInstance,
  InlineContentConfig,
  InlineContentSchema,
  InlineContentSpec,
  StyleSchema,
} from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import type { EditorProps } from '@tiptap/pm/view';

/** 行内内容 spec 的最小结构（与 BlockNote `extend` 接受的形态一致）。 */
export type NoteInlineContentSpecs = Record<string, InlineContentSpec<InlineContentConfig>>;

/**
 * 插件 slash 菜单回调使用的 editor 类型。
 *
 * 使用 BlockNote 顶层类型边界（`BlockSchema` / `InlineContentSchema` / `StyleSchema`），
 * 避免 `types.ts` 依赖 `blockNoteSchema.ts` 而产生模块循环：
 * `blockNoteSchema → plugins → NoteEditorPlugin（types）→ CustomBlockNoteEditor → blockNoteSchema`。
 *
 * 代价：插件拿到的是「宽」editor；与部分 API（如 `insertOrUpdateBlockForSlashMenu`）交互时若类型过窄会需在调用处断言。
 * `NoteSlashMenu/buildSlashMenuItems` 聚合插件 slash 项时将具体 editor 断言为 `PluginEditor`，是为规避 BlockNote 在 `options.dropCursor` 等处的类型不变性。
 */
export type PluginEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;

/**
 * 笔记正文编辑器的插件契约：schema / extension / editorProps / slash menu。
 * 各插件可用 `satisfies NoteEditorPlugin` 做结构校验。
 */
export interface NoteEditorPlugin {
  /** 插件唯一标识，用于调试与去重 */
  id: string;
  /** 贡献块级 BlockNote spec（registry 会聚合到 BlockNoteSchema.extend 的 blockSpecs） */
  blockSpecs?: BlockSpecs;
  /** 贡献行内内容 spec */
  inlineContentSpecs?: NoteInlineContentSpecs;
  /** 贡献 BlockNote / Tiptap extension（用于 useCreateBlockNote.extensions） */
  extensions?: () => ExtensionFactoryInstance[];
  /** 贡献 ProseMirror editorProps（用于 _tiptapOptions.editorProps） */
  editorProps?: () => Partial<EditorProps>;
  /** 贡献 slash 菜单项 */
  slashMenu?: (ctx: { editor: PluginEditor }) => DefaultReactSuggestionItem[];
}
