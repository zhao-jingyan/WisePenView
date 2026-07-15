import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { projectInlinePlainText } from '../../content/projection';
import type {
  NoteAiDiffComparisonContext,
  NoteBlockAiDiff,
  NoteInlineAiDiff,
  NotePluginRegistry,
} from '../../content/types';
import styles from '../../engines/aiDiff/style.module.less';
import {
  diffAiText,
  type AiDiffTextConfig,
  type AiDiffTextHunk,
  type AiDiffTextSegment,
} from '../../engines/aiDiff/wordDiff';
import type { NoteRichTextAiDiffConfig } from '../../noteConfig';
import {
  acceptInlineTextHunk,
  discardInlineTextHunk,
  sliceInlineContentByTextRange,
} from './inlineDiff';

const BOOLEAN_STYLE_TAGS = [
  ['bold', 'strong'],
  ['italic', 'em'],
  ['underline', 'u'],
  ['strike', 's'],
  ['code', 'code'],
] as const;

type RichTextDiffPlan = { mode: 'text'; hunks: readonly AiDiffTextHunk[] } | { mode: 'content' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readInlineProps(inline: Record<string, unknown>): Record<string, unknown> {
  return isRecord(inline.props) ? inline.props : inline;
}

function readInlineStyles(inline: Record<string, unknown>): Record<string, unknown> {
  return isRecord(inline.styles) ? inline.styles : {};
}

function applyColorStyle(
  element: HTMLElement,
  attribute: 'backgroundColor' | 'textColor',
  value: unknown
): void {
  if (typeof value !== 'string' || !value || value === 'default') return;
  element.dataset[attribute] = value;
}

function renderStyledText(text: string, inline: Record<string, unknown>): HTMLElement {
  const root = document.createElement('span');
  root.className = styles.styledText;
  const inlineStyles = readInlineStyles(inline);
  applyColorStyle(root, 'textColor', inlineStyles.textColor);
  applyColorStyle(root, 'backgroundColor', inlineStyles.backgroundColor);

  let contentRoot = root;
  for (const [style, tag] of BOOLEAN_STYLE_TAGS) {
    if (inlineStyles[style] !== true) continue;
    const styleRoot = document.createElement(tag);
    contentRoot.appendChild(styleRoot);
    contentRoot = styleRoot;
  }
  contentRoot.textContent = text;
  return root;
}

function renderInlineChildren(content: unknown, registry: NotePluginRegistry): DocumentFragment {
  const fragment = document.createDocumentFragment();
  if (!Array.isArray(content)) return fragment;
  for (const inline of content) {
    if (!isRecord(inline) || typeof inline.type !== 'string') continue;
    const owner = registry.inlinePlugins.get(inline.type);
    if (!owner) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `AI Diff 候选内容缺少 inline owner：${inline.type}`,
      });
    }
    fragment.appendChild(owner.aiDiff.renderAiContent(inline, registry));
  }
  return fragment;
}

function renderInlineRange(
  content: unknown,
  from: number,
  to: number,
  registry: NotePluginRegistry
): DocumentFragment {
  const slicedContent = sliceInlineContentByTextRange(content, from, to, registry);
  if (!slicedContent) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `AI Diff 无法按文本范围渲染 inline content：${from}-${to}`,
    });
  }
  return renderInlineChildren(slicedContent, registry);
}

function renderComparisonSegment(params: {
  segment: AiDiffTextSegment;
  originContent: unknown;
  replacementContent: unknown;
  originOffset: number;
  replacementOffset: number;
  registry: NotePluginRegistry;
}): { element: HTMLElement; originOffset: number; replacementOffset: number } {
  const { segment, originContent, replacementContent, originOffset, replacementOffset, registry } =
    params;
  const element = document.createElement('span');
  const isDelete = segment.kind === 'delete';
  const from = isDelete ? originOffset : replacementOffset;
  const source = isDelete ? originContent : replacementContent;
  element.appendChild(renderInlineRange(source, from, from + segment.text.length, registry));
  if (segment.kind === 'delete') element.className = styles.inlineDelete;
  if (segment.kind === 'insert') element.className = styles.inlineAdd;

  return {
    element,
    originOffset: segment.kind === 'insert' ? originOffset : originOffset + segment.text.length,
    replacementOffset:
      segment.kind === 'delete' ? replacementOffset : replacementOffset + segment.text.length,
  };
}

function resolveRichTextDiffPlan(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry,
  config: AiDiffTextConfig
): RichTextDiffPlan {
  const hunks = diffAiText(
    projectInlinePlainText(current.content, registry),
    projectInlinePlainText(aiBlock.content, registry),
    config
  );
  const actionableHunks = hunks.filter((hunk) => hunk.mode === 'hunk');
  const isFullyActionable =
    actionableHunks.length > 0 &&
    actionableHunks.every(
      (hunk) =>
        acceptInlineTextHunk({
          current: current.content,
          aiContent: aiBlock.content,
          hunk,
          registry,
        }) &&
        discardInlineTextHunk({
          current: current.content,
          aiContent: aiBlock.content,
          hunk,
          registry,
        })
    );
  return isFullyActionable ? { mode: 'text', hunks } : { mode: 'content' };
}

function appendHunkActions(
  root: HTMLElement,
  target: Parameters<NoteAiDiffComparisonContext['renderAction']>[1],
  context?: NoteAiDiffComparisonContext
): void {
  if (!context) return;
  const actions = document.createElement('span');
  actions.className = styles.inlineHunkActions;
  actions.appendChild(context.renderAction('discard', target));
  actions.appendChild(context.renderAction('accept', target));
  root.appendChild(actions);
}

function renderContentHunk(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry,
  context?: NoteAiDiffComparisonContext
): HTMLElement {
  const hunkRoot = document.createElement('span');
  hunkRoot.className = styles.inlineHunk;

  const deleted = document.createElement('span');
  deleted.className = styles.inlineDelete;
  deleted.appendChild(renderInlineChildren(current.content, registry));

  const inserted = document.createElement('span');
  inserted.className = styles.inlineAdd;
  inserted.appendChild(renderInlineChildren(aiBlock.content, registry));

  hunkRoot.append(deleted, inserted);
  appendHunkActions(hunkRoot, { kind: 'content-hunk' }, context);
  return hunkRoot;
}

function renderRichTextComparison(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry,
  config: AiDiffTextConfig,
  context?: NoteAiDiffComparisonContext
): HTMLElement {
  const root = document.createElement('span');
  root.className = styles.inlineComparison;
  const plan = resolveRichTextDiffPlan(current, aiBlock, registry, config);
  if (plan.mode === 'content') {
    root.appendChild(renderContentHunk(current, aiBlock, registry, context));
    return root;
  }
  let hunkIndex = 0;
  for (const hunk of plan.hunks) {
    if (hunk.mode === 'outside') {
      root.appendChild(
        renderInlineRange(aiBlock.content, hunk.replacementFrom, hunk.replacementTo, registry)
      );
      continue;
    }
    const hunkRoot = document.createElement('span');
    hunkRoot.className = styles.inlineHunk;
    let originOffset = hunk.originFrom;
    let replacementOffset = hunk.replacementFrom;
    for (const segment of hunk.segments) {
      const rendered = renderComparisonSegment({
        segment,
        originContent: current.content,
        replacementContent: aiBlock.content,
        originOffset,
        replacementOffset,
        registry,
      });
      originOffset = rendered.originOffset;
      replacementOffset = rendered.replacementOffset;
      hunkRoot.appendChild(rendered.element);
    }
    appendHunkActions(hunkRoot, { kind: 'text-hunk', index: hunkIndex }, context);
    root.appendChild(hunkRoot);
    hunkIndex += 1;
  }
  return root;
}

export const plainTextInlineAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent) {
    return renderStyledText(typeof aiContent.text === 'string' ? aiContent.text : '', aiContent);
  },
};

export const plainLinkInlineAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent, registry) {
    const link = document.createElement('a');
    const props = readInlineProps(aiContent);
    link.href = typeof aiContent.href === 'string' ? aiContent.href : String(props.href ?? '');
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    link.appendChild(renderInlineChildren(aiContent.content, registry));
    return link;
  },
};

export function createRichTextBlockAiDiff(config: NoteRichTextAiDiffConfig): NoteBlockAiDiff {
  const textDiffConfig: AiDiffTextConfig = {
    ...config.hunk,
    ...config.limits,
  };
  return {
    renderAiContent(aiBlock, registry) {
      const root = document.createElement('span');
      root.appendChild(renderInlineChildren(aiBlock.content, registry));
      return root;
    },
    comparison: {
      render(current, aiBlock, registry, context) {
        return renderRichTextComparison(current, aiBlock, registry, textDiffConfig, context);
      },
    },
    applyGranular(block, aiContent, action, target, registry) {
      if (target.kind === 'content-hunk') {
        return action === 'accept' ? aiContent : block.content;
      }
      const aiBlock = { ...block, content: aiContent };
      const plan = resolveRichTextDiffPlan(block, aiBlock, registry, textDiffConfig);
      if (plan.mode !== 'text') return null;
      const hunk = plan.hunks.filter((item) => item.mode === 'hunk')[target.index];
      if (!hunk) return null;

      if (action === 'accept') {
        return acceptInlineTextHunk({
          current: block.content,
          aiContent,
          hunk,
          registry,
        });
      }

      return discardInlineTextHunk({
        current: block.content,
        aiContent,
        hunk,
        registry,
      });
    },
  };
}
