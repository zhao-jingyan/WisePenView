import type { Node as PmNode } from '@tiptap/pm/model';

import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { INLINE_MATH_PM_TYPE, type FormulaInlineCommentAnchor } from './inlineCommentAnchor';

const BLOCK_CONTAINER_TYPE = 'blockContainer';

export type FormulaInlineCommentPosition = { from: number; to: number };

function getBlockContainerId(node: PmNode): string | undefined {
  const id = node.attrs?.id;
  return typeof id === 'string' && id ? id : undefined;
}

function getBlockContentRange(
  blockContainer: PmNode,
  posBeforeContainer: number
): { node: PmNode; from: number; to: number } | null {
  let result: { node: PmNode; from: number; to: number } | null = null;
  blockContainer.forEach((child: PmNode, offset: number) => {
    if (child.type.spec.group !== 'blockContent') {
      return;
    }
    const from = posBeforeContainer + offset + 1;
    result = { node: child, from, to: from + child.nodeSize };
  });
  return result;
}

function findBlockContainerById(
  doc: PmNode,
  blockId: string
): { node: PmNode; posBefore: number } | null {
  let result: { node: PmNode; posBefore: number } | null = null;
  try {
    doc.descendants((node: PmNode, pos: number) => {
      if (node.type.name !== BLOCK_CONTAINER_TYPE || getBlockContainerId(node) !== blockId) {
        return;
      }
      result = { node, posBefore: pos };
      return false;
    });
  } catch {
    return null;
  }
  return result;
}

export function captureInlineMathAnchor(
  editor: Pick<CustomBlockNoteEditor, 'prosemirrorView'>,
  shell: HTMLElement
): FormulaInlineCommentAnchor | null {
  const view = editor.prosemirrorView;
  try {
    const start = view.posAtDOM(shell, 0);
    const $pos = view.state.doc.resolve(start);
    const inlineFrom =
      $pos.nodeAfter?.type.name === INLINE_MATH_PM_TYPE
        ? start
        : $pos.nodeBefore?.type.name === INLINE_MATH_PM_TYPE
          ? start - $pos.nodeBefore.nodeSize
          : null;
    if (inlineFrom === null) {
      return null;
    }

    let parentContainer: { node: PmNode; posBefore: number } | null = null;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node: PmNode, pos: number) => {
      if (node.type.name !== BLOCK_CONTAINER_TYPE) {
        return;
      }
      if (inlineFrom >= pos && inlineFrom < pos + node.nodeSize) {
        parentContainer = { node, posBefore: pos };
        return false;
      }
      return undefined;
    });
    if (!parentContainer) {
      return null;
    }

    const { node: containerNode, posBefore } = parentContainer;
    const blockId = getBlockContainerId(containerNode);
    const content = getBlockContentRange(containerNode, posBefore);
    if (!blockId || !content) {
      return null;
    }

    let inlineIndex = 0;
    let matchedIndex: number | null = null;
    content.node.forEach((child: PmNode, offset: number) => {
      if (child.type.name !== INLINE_MATH_PM_TYPE) {
        return;
      }
      if (content.from + offset + 1 === inlineFrom) {
        matchedIndex = inlineIndex;
      }
      inlineIndex += 1;
    });
    return matchedIndex === null ? null : { kind: 'inline', blockId, inlineIndex: matchedIndex };
  } catch {
    return null;
  }
}

export function resolveFormulaInlineCommentPosition(
  editor: CustomBlockNoteEditor,
  anchor: FormulaInlineCommentAnchor
): FormulaInlineCommentPosition | null {
  const doc = editor.prosemirrorView.state.doc;
  const container = findBlockContainerById(doc, anchor.blockId);
  if (!container) {
    return null;
  }
  const content = getBlockContentRange(container.node, container.posBefore);
  if (!content) {
    return null;
  }
  if (anchor.kind === 'block') {
    return content.node.type.name === 'math' ? { from: content.from, to: content.to } : null;
  }

  let inlineIndex = 0;
  let resolved: FormulaInlineCommentPosition | null = null;
  content.node.forEach((child, offset) => {
    if (resolved || child.type.name !== INLINE_MATH_PM_TYPE) {
      return;
    }
    if (inlineIndex === anchor.inlineIndex) {
      const from = content.from + offset + 1;
      resolved = { from, to: from + child.nodeSize };
    }
    inlineIndex += 1;
  });
  return resolved;
}
