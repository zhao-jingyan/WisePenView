import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import type {
  NoteAiDiffAction,
  NoteAiDiffActionTarget,
  NoteAiDiffComparisonContext,
  NoteEditorExtension,
  NotePluginRegistry,
} from '../../registry/types';
import { resolveNoteAiDiffBlock } from './contentState';
import styles from './style.module.less';

export interface NoteAiDiffActionRequest {
  blockId: string;
  action: NoteAiDiffAction;
  target?: NoteAiDiffActionTarget;
}

interface AiDiffExtensionMeta {
  displayMode?: AiDiffDisplayMode;
  aiContentByBlockId?: ReadonlyMap<string, unknown>;
  actionsEnabled?: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
}

interface AiDiffExtensionState {
  displayMode: AiDiffDisplayMode;
  aiContentByBlockId: ReadonlyMap<string, unknown>;
  actionsEnabled: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  decorations: DecorationSet;
}

const aiDiffExtensionPluginKey = new PluginKey<AiDiffExtensionState>('noteAiDiffExtension');

function buildActionButton(
  label: string,
  className: string,
  request: NoteAiDiffActionRequest,
  onAction: (request: NoteAiDiffActionRequest) => void,
  accessibleLabel = label
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${styles.actionButton} ${className}`;
  button.textContent = label;
  button.title = accessibleLabel;
  button.setAttribute('aria-label', accessibleLabel);
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onAction(request);
  });
  return button;
}

function createReviewWidget(params: {
  blockId: string;
  contentType: string;
  changeKind: 'create' | 'update' | 'delete';
  current: Record<string, unknown>;
  aiBlock: Record<string, unknown>;
  aiContentEmpty: boolean;
  displayMode: AiDiffDisplayMode;
  actionsEnabled: boolean;
  hunkActions: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  renderAiContent: (aiBlock: Record<string, unknown>) => HTMLElement;
  renderComparison?: (
    current: Record<string, unknown>,
    aiBlock: Record<string, unknown>,
    context?: NoteAiDiffComparisonContext
  ) => HTMLElement;
}): HTMLElement {
  const {
    blockId,
    contentType,
    changeKind,
    current,
    aiBlock,
    aiContentEmpty,
    displayMode,
    actionsEnabled,
    hunkActions,
    onAction,
    renderAiContent,
    renderComparison,
  } = params;
  const root = document.createElement('div');
  root.className = styles.review;
  root.contentEditable = 'false';
  root.dataset.aiDiffReview = blockId;
  root.dataset.aiDiffContentType = contentType;
  root.dataset.aiDiffChangeKind = changeKind;
  const customComparison = Boolean(
    displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && renderComparison
  );

  if (!aiContentEmpty) {
    const aiContentRoot = document.createElement('div');
    aiContentRoot.className = customComparison
      ? styles.comparison
      : displayMode === AI_DIFF_DISPLAY_MODE.COMPARE
        ? styles.aiContent
        : styles.aiContentPlain;
    const comparisonContext =
      customComparison && hunkActions && actionsEnabled && onAction
        ? {
            renderAction: (action: NoteAiDiffAction, target: NoteAiDiffActionTarget) =>
              buildActionButton(
                action === 'accept' ? '✓' : '×',
                `${styles.reviewAction} ${
                  action === 'accept' ? styles.reviewAccept : styles.reviewDiscard
                }`,
                { blockId, action, target },
                onAction,
                action === 'accept' ? '接受此处修改' : '拒绝此处修改'
              ),
          }
        : undefined;
    aiContentRoot.appendChild(
      customComparison && renderComparison
        ? renderComparison(current, aiBlock, comparisonContext)
        : renderAiContent(aiBlock)
    );
    root.appendChild(aiContentRoot);
  }

  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && actionsEnabled && onAction) {
    const actions = document.createElement('div');
    actions.className = styles.actions;
    actions.appendChild(
      buildActionButton(
        '×',
        `${styles.reviewAction} ${styles.reviewDiscard}`,
        { blockId, action: 'discard' },
        onAction,
        '拒绝此块修改'
      )
    );
    actions.appendChild(
      buildActionButton(
        '✓',
        `${styles.reviewAction} ${styles.reviewAccept}`,
        { blockId, action: 'accept' },
        onAction,
        '接受此块修改'
      )
    );
    root.appendChild(actions);
  }
  return root;
}

function buildDecorations(params: {
  doc: PMNode;
  editorSchema: {
    blockSchema: unknown;
    inlineContentSchema: unknown;
    styleSchema: unknown;
  };
  proseMirrorSchema: unknown;
  registry: NotePluginRegistry;
  extensionState: Omit<AiDiffExtensionState, 'decorations'>;
}): DecorationSet {
  const { doc, editorSchema, proseMirrorSchema, registry, extensionState } = params;
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') return true;
    const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    if (!extensionState.aiContentByBlockId.has(blockId)) return true;
    const aiContent = extensionState.aiContentByBlockId.get(blockId);

    let block: Record<string, unknown> & { type: string };
    try {
      block = nodeToBlock(
        node,
        proseMirrorSchema as never,
        editorSchema.blockSchema as never,
        editorSchema.inlineContentSchema as never,
        editorSchema.styleSchema as never
      ) as unknown as Record<string, unknown> & { type: string };
    } catch {
      return true;
    }

    const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
    const projection = aiDiff ? resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry) : null;
    if (!aiDiff || !projection) return true;

    let contentFrom = pos;
    let contentTo = pos + node.nodeSize;
    node.forEach((child, offset) => {
      if (child.type.spec.group !== 'blockContent') return;
      contentFrom = pos + 1 + offset;
      contentTo = contentFrom + child.nodeSize;
    });

    const hideWholeBlock =
      (extensionState.displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY && projection.currentEmpty) ||
      (extensionState.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY && projection.aiContentEmpty);
    if (hideWholeBlock) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
      return false;
    }

    const hasCustomComparison = Boolean(
      extensionState.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE &&
      !projection.currentEmpty &&
      !projection.aiContentEmpty &&
      aiDiff.comparison
    );
    const hideCurrent =
      projection.currentEmpty ||
      extensionState.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY ||
      hasCustomComparison;
    if (hideCurrent) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
    } else if (extensionState.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.current,
          'data-ai-diff-current': 'true',
          contenteditable: 'false',
        })
      );
    }

    const shouldRenderWidget =
      extensionState.displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY &&
      (!projection.aiContentEmpty || extensionState.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE);
    if (shouldRenderWidget) {
      decorations.push(
        Decoration.widget(
          contentTo,
          () =>
            createReviewWidget({
              blockId,
              contentType: block.type,
              changeKind: projection.changeKind,
              current: projection.current,
              aiBlock: projection.aiBlock,
              aiContentEmpty: projection.aiContentEmpty,
              displayMode: extensionState.displayMode,
              actionsEnabled: extensionState.actionsEnabled,
              hunkActions: Boolean(hasCustomComparison && aiDiff.applyGranular),
              onAction: extensionState.onAction,
              renderAiContent: (aiBlock) => aiDiff.renderAiContent(aiBlock, registry),
              renderComparison:
                hasCustomComparison && aiDiff.comparison
                  ? (current, aiBlock, context) =>
                      aiDiff.comparison!.render(current, aiBlock, registry, context)
                  : undefined,
            }),
          { side: 1, stopEvent: () => true }
        )
      );
    }
    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function createAiDiffExtension(registry: NotePluginRegistry) {
  return createExtension(({ editor }) => ({
    key: 'noteAiDiffExtension',
    prosemirrorPlugins: [
      new Plugin<AiDiffExtensionState>({
        key: aiDiffExtensionPluginKey,
        state: {
          init: () => ({
            displayMode: AI_DIFF_DISPLAY_MODE.COMPARE,
            aiContentByBlockId: new Map(),
            actionsEnabled: false,
            decorations: DecorationSet.empty,
          }),
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffExtensionPluginKey) as AiDiffExtensionMeta | undefined;
            const extensionState = {
              displayMode: meta?.displayMode ?? previous.displayMode,
              aiContentByBlockId: meta?.aiContentByBlockId ?? previous.aiContentByBlockId,
              actionsEnabled: meta?.actionsEnabled ?? previous.actionsEnabled,
              onAction: meta?.onAction ?? previous.onAction,
            };
            if (!tr.docChanged && !meta) return previous;
            return {
              ...extensionState,
              decorations: buildDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                proseMirrorSchema: newState.schema,
                registry,
                extensionState,
              }),
            };
          },
        },
        props: {
          decorations: (state) => aiDiffExtensionPluginKey.getState(state)?.decorations ?? null,
        },
      }),
    ],
  }));
}

export function syncAiDiffExtensionState(view: EditorView, meta: AiDiffExtensionMeta): void {
  view.dispatch(
    view.state.tr.setMeta(aiDiffExtensionPluginKey, meta).setMeta('addToHistory', false)
  );
}

export function readAiContentFromEditorState(state: EditorState): ReadonlyMap<string, unknown> {
  return aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId ?? new Map();
}

export function hasAiDiffForBlockInEditorState(
  state: EditorState,
  block: Record<string, unknown>,
  registry: NotePluginRegistry
): boolean {
  const blockId = typeof block.id === 'string' ? block.id : '';
  const type = typeof block.type === 'string' ? block.type : '';
  const aiContentByBlockId = aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId;
  const aiDiff = registry.blockPlugins.get(type)?.aiDiff;
  if (!aiContentByBlockId?.has(blockId) || !aiDiff) return false;
  return Boolean(resolveNoteAiDiffBlock(block, aiContentByBlockId.get(blockId), aiDiff, registry));
}

export const aiDiffEditorExtension = {
  id: 'ai-diff.extension',
  print: {
    styles: [
      `.note-print-body [data-ai-diff-current-hidden='true'] {
  display: none !important;
}`,
    ],
  },
  extensions: ({ registry }) => [createAiDiffExtension(registry)()],
} satisfies NoteEditorExtension;
