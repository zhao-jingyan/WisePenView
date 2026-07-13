import type { CustomBlockNoteEditor } from '../../../blockNoteSchema';
import type { NoteAiDiffAction, NotePluginRegistry } from '../../types';

function blockHasNestedChildren(block: { children?: readonly unknown[] }): boolean {
  return Array.isArray(block.children) && block.children.length > 0;
}

export function applyAllNoteAiDiffActions(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  action: NoteAiDiffAction
): void {
  const blocks: Parameters<Parameters<typeof editor.forEachBlock>[0]>[0][] = [];
  editor.forEachBlock((block) => {
    blocks.push(block);
    return true;
  });

  const updates: Array<{
    block: (typeof blocks)[number];
    update: Parameters<typeof editor.updateBlock>[1];
  }> = [];
  const blocksToRemove: Parameters<typeof editor.removeBlocks>[0] = [];

  for (const block of blocks) {
    const owner = registry.blockPlugins.get(block.type);
    const result = owner?.aiDiff?.applyAll(
      block as unknown as Record<string, unknown>,
      action,
      registry
    );
    if (!result || result.kind === 'none') continue;
    if (
      result.kind === 'remove' ||
      (result.removeWhenChildless && !blockHasNestedChildren(block))
    ) {
      blocksToRemove.push(block);
      continue;
    }
    updates.push({
      block,
      update: {
        ...('content' in result ? { content: result.content } : {}),
        ...('props' in result ? { props: result.props } : {}),
      } as Parameters<typeof editor.updateBlock>[1],
    });
  }

  for (const item of updates) {
    try {
      editor.updateBlock(item.block, item.update);
    } catch {
      void 0;
    }
  }
  for (let index = blocksToRemove.length - 1; index >= 0; index -= 1) {
    const block = blocksToRemove[index];
    if (!block) continue;
    try {
      editor.removeBlocks([block]);
    } catch {
      void 0;
    }
  }
  editor.focus();
}
