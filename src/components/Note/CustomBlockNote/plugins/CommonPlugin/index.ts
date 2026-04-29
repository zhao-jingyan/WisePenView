import type { NoteEditorPlugin } from '../types';
import { stripEscapeCharExtension, stripEscapeEditorProps } from './stripEscape';

/**
 * 通用编辑器能力集合：Esc 字符清洗。
 * Yjs 撤销与外壳快捷键见 `CustomBlockNote/hooks`。
 *
 * 默认 slash 菜单裁剪在 `Note/NoteSlashMenu` 内配置。
 */
export const commonPlugin = {
  id: 'common',
  extensions: () => [stripEscapeCharExtension],
  editorProps: () => stripEscapeEditorProps,
} satisfies NoteEditorPlugin;
