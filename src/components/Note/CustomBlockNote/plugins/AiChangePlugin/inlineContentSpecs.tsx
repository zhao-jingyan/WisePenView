import { createReactInlineContentSpec } from '@blocknote/react';

import {
  AiAddExportHTML,
  AiAddView,
  AiDeleteExportHTML,
  AiDeleteView,
  AiDiffExportHTML,
  AiDiffView,
  AiLinkAddExportHTML,
  AiLinkAddView,
  AiLinkDeleteExportHTML,
  AiLinkDeleteView,
} from './inlineContentViews.tsx'; // 从同目录文件集中引入这 4 类行内节点的“编辑器渲染”和“导出 HTML”实现

const aiDiffConfig = {
  type: 'ai-diff', // 该行内节点的类型标识（BlockNote 用它区分不同 inline content）
  propSchema: {
    origin: { default: '' },
    replace: { default: '' },
    key: { default: '' }, // 标识片段
    granularity: { default: 'word' }, // diff 粒度：当前默认为“按词”，为未来扩展粒度预留（字符/词/句子/块）
  },
  content: 'none', // 声明该 inline content 不包含子内容（它完全由 props 驱动渲染）
} as const;

const aiAddConfig = {
  type: 'ai-add',
  propSchema: {
    text: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

const aiDeleteConfig = {
  type: 'ai-delete',
  propSchema: {
    text: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

const aiLinkAddConfig = {
  type: 'ai-link-add',
  propSchema: {
    text: { default: '' },
    href: { default: '' },
    content: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

const aiLinkDeleteConfig = {
  type: 'ai-link-delete',
  propSchema: {
    text: { default: '' },
    href: { default: '' },
    content: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

export const aiDiffInlineContentSpec = createReactInlineContentSpec(aiDiffConfig, {
  render: AiDiffView, // 编辑器内渲染：把该 inline content 显示成自定义 React 视图（例如高亮 diff）
  toExternalHTML: AiDiffExportHTML, // 导出渲染：把该 inline content 转成外部 HTML（用于复制/导出/保存为 HTML）
}); // 生成并导出 “ai-diff” 的 InlineContentSpec，供插件/编辑器初始化时注册

export const aiAddInlineContentSpec = createReactInlineContentSpec(aiAddConfig, {
  render: AiAddView,
  toExternalHTML: AiAddExportHTML,
});

export const aiDeleteInlineContentSpec = createReactInlineContentSpec(aiDeleteConfig, {
  render: AiDeleteView,
  toExternalHTML: AiDeleteExportHTML,
});

export const aiLinkAddInlineContentSpec = createReactInlineContentSpec(aiLinkAddConfig, {
  render: AiLinkAddView,
  toExternalHTML: AiLinkAddExportHTML,
});

export const aiLinkDeleteInlineContentSpec = createReactInlineContentSpec(aiLinkDeleteConfig, {
  render: AiLinkDeleteView,
  toExternalHTML: AiLinkDeleteExportHTML,
});
