import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import type {
  NoteAiContentPayload,
  NoteAiDiffAction,
  NotePluginRegistry,
  NoteRuntimeExtension,
} from '../../content/types';
import styles from './style.module.less';

export interface NoteAiDiffActionRequest {
  blockId: string;
  revision: string;
  action: NoteAiDiffAction;
}

interface AiDiffRuntimeMeta {
  displayMode?: AiDiffDisplayMode;
  payloads?: ReadonlyMap<string, NoteAiContentPayload>;
  actionsEnabled?: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
}

interface AiDiffRuntimeState {
  displayMode: AiDiffDisplayMode;
  payloads: ReadonlyMap<string, NoteAiContentPayload>;
  actionsEnabled: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  decorations: DecorationSet;
}

const aiDiffRuntimePluginKey = new PluginKey<AiDiffRuntimeState>('noteAiDiffRuntime');

function buildActionButton(
  label: string,
  className: string,
  request: NoteAiDiffActionRequest,
  onAction: (request: NoteAiDiffActionRequest) => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${styles.actionButton} ${className}`;
  button.textContent = label;
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
  payload: NoteAiContentPayload;
  candidate: Record<string, unknown> | null;
  stale: boolean;
  displayMode: AiDiffDisplayMode;
  actionsEnabled: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  renderCandidate: (candidate: Record<string, unknown>) => HTMLElement;
}): HTMLElement {
  const {
    blockId,
    payload,
    candidate,
    stale,
    displayMode,
    actionsEnabled,
    onAction,
    renderCandidate,
  } = params;
  const root = document.createElement('div');
  root.className = styles.review;
  root.contentEditable = 'false';
  root.dataset.aiDiffReview = blockId;

  if (candidate) {
    const candidateRoot = document.createElement('div');
    candidateRoot.className =
      displayMode === AI_DIFF_DISPLAY_MODE.COMPARE ? styles.candidate : styles.candidatePlain;
    candidateRoot.appendChild(renderCandidate(candidate));
    root.appendChild(candidateRoot);
  }

  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && actionsEnabled && onAction) {
    const actions = document.createElement('div');
    actions.className = styles.actions;
    if (stale) {
      const staleLabel = document.createElement('span');
      staleLabel.className = styles.stale;
      staleLabel.textContent = '正文已变化';
      actions.appendChild(staleLabel);
      if (payload.operation !== 'create') {
        actions.appendChild(
          buildActionButton(
            '撤销',
            styles.discard,
            { blockId, revision: payload.revision, action: 'discard' },
            onAction
          )
        );
      }
    } else {
      actions.appendChild(
        buildActionButton(
          '保留',
          styles.accept,
          { blockId, revision: payload.revision, action: 'accept' },
          onAction
        )
      );
      actions.appendChild(
        buildActionButton(
          '撤销',
          styles.discard,
          { blockId, revision: payload.revision, action: 'discard' },
          onAction
        )
      );
    }
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
  runtime: Omit<AiDiffRuntimeState, 'decorations'>;
}): DecorationSet {
  const { doc, editorSchema, proseMirrorSchema, registry, runtime } = params;
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') return true;
    const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    const payload = runtime.payloads.get(blockId);
    if (!payload) return true;

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

    const owner = registry.blockPlugins.get(block.type);
    const projection = owner?.aiDiff?.resolve(block, payload, registry);
    if (!owner?.aiDiff || !projection) return true;

    let contentFrom = pos;
    let contentTo = pos + node.nodeSize;
    node.forEach((child, offset) => {
      if (child.type.spec.group !== 'blockContent') return;
      contentFrom = pos + 1 + offset;
      contentTo = contentFrom + child.nodeSize;
    });

    const hideWholeBlock =
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY && projection.current === null) ||
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY && projection.candidate === null);
    if (hideWholeBlock) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
      return false;
    }

    const hideCurrent =
      projection.current === null || runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY;
    if (hideCurrent) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
    } else if (runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.current,
          'data-ai-diff-current': 'true',
          contenteditable: 'false',
        })
      );
    }

    const shouldRenderWidget =
      runtime.displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY &&
      (projection.candidate !== null || runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE);
    if (shouldRenderWidget) {
      decorations.push(
        Decoration.widget(
          contentTo,
          () =>
            createReviewWidget({
              blockId,
              payload,
              candidate: projection.candidate,
              stale: projection.stale,
              displayMode: runtime.displayMode,
              actionsEnabled: runtime.actionsEnabled,
              onAction: runtime.onAction,
              renderCandidate: (candidate) => owner.aiDiff!.renderCandidate(candidate, registry),
            }),
          {
            key: `ai-diff:${blockId}:${payload.revision}:${runtime.displayMode}`,
            side: 1,
            stopEvent: () => true,
          }
        )
      );
    }
    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function createAiDiffRuntimeExtension(registry: NotePluginRegistry) {
  return createExtension(({ editor }) => ({
    key: 'noteAiDiffRuntime',
    prosemirrorPlugins: [
      new Plugin<AiDiffRuntimeState>({
        key: aiDiffRuntimePluginKey,
        state: {
          init: (_config, state) => ({
            displayMode: AI_DIFF_DISPLAY_MODE.COMPARE,
            payloads: new Map(),
            actionsEnabled: false,
            decorations: DecorationSet.empty,
          }),
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffRuntimePluginKey) as AiDiffRuntimeMeta | undefined;
            const runtime = {
              displayMode: meta?.displayMode ?? previous.displayMode,
              payloads: meta?.payloads ?? previous.payloads,
              actionsEnabled: meta?.actionsEnabled ?? previous.actionsEnabled,
              onAction: meta?.onAction ?? previous.onAction,
            };
            if (!tr.docChanged && !meta) return previous;
            return {
              ...runtime,
              decorations: buildDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                proseMirrorSchema: newState.schema,
                registry,
                runtime,
              }),
            };
          },
        },
        props: {
          decorations: (state) => aiDiffRuntimePluginKey.getState(state)?.decorations ?? null,
        },
      }),
    ],
  }));
}

export function syncAiDiffRuntimeState(view: EditorView, meta: AiDiffRuntimeMeta): void {
  view.dispatch(view.state.tr.setMeta(aiDiffRuntimePluginKey, meta).setMeta('addToHistory', false));
}

export function readAiDiffPayloadsFromEditorState(
  state: EditorState
): ReadonlyMap<string, NoteAiContentPayload> {
  return aiDiffRuntimePluginKey.getState(state)?.payloads ?? new Map();
}

export function hasAiDiffForBlockInEditorState(
  state: EditorState,
  block: Record<string, unknown>,
  registry: NotePluginRegistry
): boolean {
  const blockId = typeof block.id === 'string' ? block.id : '';
  const type = typeof block.type === 'string' ? block.type : '';
  const payload = aiDiffRuntimePluginKey.getState(state)?.payloads.get(blockId);
  return Boolean(
    payload && registry.blockPlugins.get(type)?.aiDiff?.resolve(block, payload, registry)
  );
}

export const aiDiffRuntimeExtension = {
  id: 'ai-diff.runtime',
  print: {
    styles: [
      `.note-print-body [data-ai-diff-current-hidden='true'] {
  display: none !important;
}`,
    ],
  },
  extensions: ({ registry }) => [createAiDiffRuntimeExtension(registry)()],
} satisfies NoteRuntimeExtension;
