import type { NoteEditorPlugin } from '../types';
import { inlineMathContentSpec } from './InlineMath';
import { createMathBlockSpec } from './MathBlock';
import { inlineMathDollarExtension } from './InlineMath/inlineMathDollarExtension';
import { createMathSlashMenuItem } from './slashMenuItem';

/**
 * LaTeX 插件：贡献 `math` 块、`inlineMath` 行内内容、`$$...$$` 自动转换扩展，
 * 以及 slash 菜单中的「公式」入口。
 */
export const latexPlugin = {
  id: 'latex',
  blockSpecs: {
    math: createMathBlockSpec(),
  },
  inlineContentSpecs: {
    inlineMath: inlineMathContentSpec,
  },
  extensions: () => [inlineMathDollarExtension()],
  slashMenu: ({ editor }) => [createMathSlashMenuItem(editor)],
} satisfies NoteEditorPlugin;
