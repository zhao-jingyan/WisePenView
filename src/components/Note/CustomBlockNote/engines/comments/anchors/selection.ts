import type { NoteCommentFacet, NotePluginRegistry } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';
import { hasAiDiffForBlockInEditorState } from '../../aiDiff/runtime';

function getCommentsPolicy(
  type: string,
  registry: NotePluginRegistry
): NoteCommentFacet | undefined {
  return registry.inlinePlugins.get(type)?.comments ?? registry.blockPlugins.get(type)?.comments;
}

function blockRejectsDocumentThread(
  editor: CustomBlockNoteEditor,
  block: { type: string },
  registry: NotePluginRegistry
): boolean {
  const policy = registry.blockPlugins.get(block.type)?.comments;
  return (
    policy?.mode !== 'range' ||
    hasAiDiffForBlockInEditorState(
      editor.prosemirrorView.state,
      block as unknown as Record<string, unknown>,
      registry
    )
  );
}

function currentBlockRejectsDocumentThread(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (selectedBlocks?.some((block) => blockRejectsDocumentThread(editor, block, registry))) {
      return true;
    }
  } catch {
    // 自定义原子块选区不一定能映射为 BlockNote selection，继续检查 PM selection。
  }

  try {
    return blockRejectsDocumentThread(editor, editor.getTextCursorPosition().block, registry);
  } catch {
    return false;
  }
}

export function isDocumentThreadRangeAllowed(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  from: number,
  to: number
): boolean {
  if (from >= to) return false;
  const { doc } = editor.prosemirrorView.state;
  let allowed = true;
  doc.nodesBetween(from, to, (node) => {
    const policy = getCommentsPolicy(node.type.name, registry);
    if (policy && policy.mode !== 'range') {
      allowed = false;
      return false;
    }
    return allowed;
  });
  return allowed;
}

/** 当前选区是否允许创建正文范围批注。 */
export function isCommentableSelection(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  if (currentBlockRejectsDocumentThread(editor, registry)) return false;
  const { from, to, empty, $from } = editor.prosemirrorView.state.selection;
  if (empty) {
    const adjacentTypes = [$from.nodeAfter?.type.name, $from.nodeBefore?.type.name];
    if (adjacentTypes.some((type) => type && getCommentsPolicy(type, registry)?.mode !== 'range')) {
      return false;
    }
  }
  return empty || isDocumentThreadRangeAllowed(editor, registry, from, to);
}

function selectionTouchesHiddenToolbarOwner(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  const { selection, doc } = editor.prosemirrorView.state;
  const hidesToolbar = (type: string) =>
    getCommentsPolicy(type, registry)?.hideFormattingToolbar === true;

  if (hidesToolbar(selection.$from.nodeAfter?.type.name ?? '')) return true;
  if (hidesToolbar(selection.$from.nodeBefore?.type.name ?? '')) return true;

  let hidden = false;
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (hidesToolbar(node.type.name)) {
      hidden = true;
      return false;
    }
    return !hidden;
  });
  return hidden;
}

/** 内容 owner 可隐藏正文 formatting toolbar，为独立内容 surface 让出交互。 */
export function shouldHideNoteFormattingToolbar(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): boolean {
  if (selectionTouchesHiddenToolbarOwner(editor, registry)) return true;

  try {
    const selectedBlocks = editor.getSelection()?.blocks;
    if (
      selectedBlocks?.length === 1 &&
      registry.blockPlugins.get(selectedBlocks[0].type)?.comments.hideFormattingToolbar
    ) {
      return true;
    }
  } catch {
    // 自定义原子块选区不一定能映射为 BlockNote selection，继续检查光标块。
  }

  try {
    const block = editor.getTextCursorPosition().block;
    return registry.blockPlugins.get(block.type)?.comments.hideFormattingToolbar === true;
  } catch {
    return false;
  }
}
