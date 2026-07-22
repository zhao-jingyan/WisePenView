import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Workflow } from 'lucide-react';
import { createElement } from 'react';

import type { PluginEditor } from '../../registry/types';
import { DEFAULT_MERMAID_SOURCE } from './source';

/** `insertOrUpdateBlockForSlashMenu` 第二个参数的类型（PartialBlock<...>）。 */
type SlashMenuPartialBlock = Parameters<typeof insertOrUpdateBlockForSlashMenu>[1];

export function createMermaidSlashMenuItem(editor: PluginEditor): DefaultReactSuggestionItem {
  const mermaidBlock = {
    type: 'mermaid',
    content: DEFAULT_MERMAID_SOURCE,
  } as unknown as SlashMenuPartialBlock;

  return {
    title: 'Mermaid 图表',
    group: '高级',
    aliases: ['mermaid', 'diagram', 'flowchart', 'chart', '图表', '流程图'],
    subtext: '插入可协同编辑的 Mermaid 图表',
    icon: createElement(Workflow, { size: 18 }),
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, mermaidBlock),
  };
}
