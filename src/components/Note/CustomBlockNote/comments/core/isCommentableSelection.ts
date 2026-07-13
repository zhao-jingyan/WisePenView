import { NodeSelection } from '@tiptap/pm/state';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import { hasAiDiffInBlock } from '../../plugins/presence';
import type { NotePluginRegistry } from '../../plugins/types';
import { INLINE_MATH_PM_TYPE } from './commentThreadConstants';

function selectionBlocksHaveAiDiff(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (selectedBlocks?.some((block) => hasAiDiffInBlock(block, registry))) {
      return true;
    }
  } catch {
    // Some custom block selections don't map cleanly to BlockNote selection.
  }

  try {
    const cursorBlock = editor.getTextCursorPosition().block;
    if (hasAiDiffInBlock(cursorBlock, registry)) {
      return true;
    }
  } catch {
    // No text cursor position for the current selection.
  }

  return false;
}

function prosemirrorSelectionHasNonCommentableInline(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  const { selection, doc } = editor.prosemirrorView.state;
  if (selection.empty) {
    return false;
  }

  let hasAiDiff = false;
  doc.nodesBetween(selection.from, selection.to, (node) => {
    const owner = registry.inlinePlugins.get(node.type.name);
    if (owner && !owner.comments.canCreateDocumentThread) {
      hasAiDiff = true;
      return false;
    }
    return !hasAiDiff;
  });
  return hasAiDiff;
}

/** 当前选区是否允许创建批注（AIDiff 块/行内内容不可批注） */
export function isCommentableSelection(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  if (selectionBlocksHaveAiDiff(editor, registry)) {
    return false;
  }
  if (prosemirrorSelectionHasNonCommentableInline(editor, registry)) {
    return false;
  }
  return true;
}

function selectionInvolvesInlineMath(editor: CustomBlockNoteEditor): boolean {
  const { selection, doc } = editor.prosemirrorView.state;

  if (selection instanceof NodeSelection && selection.node.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }

  const { from, to } = selection;
  if (from < to) {
    let found = false;
    doc.nodesBetween(from, to, (node) => {
      if (node.type.name === INLINE_MATH_PM_TYPE) {
        found = true;
      }
    });
    if (found) {
      return true;
    }
  }

  const $from = doc.resolve(from);
  if ($from.nodeAfter?.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }
  if ($from.nodeBefore?.type.name === INLINE_MATH_PM_TYPE) {
    return true;
  }

  return false;
}

/** math / inlineMath 选中时不显示正文 formatting toolbar，与公式批注入口互斥 */
export function shouldHideFormattingToolbarForMathBlock(editor: CustomBlockNoteEditor): boolean {
  if (selectionInvolvesInlineMath(editor)) {
    return true;
  }

  const { selection, doc } = editor.prosemirrorView.state;

  if (!selection.empty) {
    const selectedNode = doc.nodeAt(selection.from);
    if (
      selectedNode?.type.name === 'math' &&
      selection.to <= selection.from + selectedNode.nodeSize
    ) {
      return true;
    }
  }

  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (selectedBlocks?.length === 1 && selectedBlocks[0].type === 'math') {
      return true;
    }
  } catch {
    // Some custom block selections don't map cleanly to BlockNote selection.
  }

  try {
    return editor.getTextCursorPosition().block.type === 'math';
  } catch {
    return false;
  }
}
