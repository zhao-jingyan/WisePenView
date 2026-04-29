import { createElement } from 'react';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { RiFormula } from 'react-icons/ri';

import type { PluginEditor } from '../types';

/** `insertOrUpdateBlockForSlashMenu` 第二个参数的类型（PartialBlock<...>） */
type SlashMenuPartialBlock = Parameters<typeof insertOrUpdateBlockForSlashMenu>[1];

/**
 * 「公式」菜单项：点击后插入空 `math` 块并触发块内自动进入编辑态。
 *
 * 接收 `PluginEditor`（BlockNote 顶层类型）以避免与 `blockNoteSchema` 形成循环引用；
 * `insertOrUpdateBlockForSlashMenu` 在该宽类型下要求 `type` 为已知字面量，因此对 `math` 块做一次断言。
 */
export function createMathSlashMenuItem(editor: PluginEditor): DefaultReactSuggestionItem {
  const mathBlock = {
    type: 'math',
    props: { expression: '', autoEdit: true },
  } as unknown as SlashMenuPartialBlock;
  return {
    title: '公式',
    group: '高级',
    aliases: ['math', 'katex', 'latex', 'block', '块', 'equation', '独立'],
    subtext: '插入独占一行的块级 KaTeX 公式',
    icon: createElement(RiFormula, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mathBlock),
  };
}
