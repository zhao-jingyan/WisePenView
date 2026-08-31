import type { NoteAiDiffPreviewData, NoteBlockSnapshot } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import historyMockData from './history.mock.json';

export type HistoryContentSource = 'human' | 'ai';

interface HistoryFragment {
  id: string;
  source: HistoryContentSource;
  text: string;
}

interface HistoryBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'bulletListItem' | 'quote';
  level?: 1 | 2 | 3;
  fragments: HistoryFragment[];
}

type HistoryDelta =
  | {
      type: 'insertBlock';
      afterBlockId: string | null;
      block: HistoryBlock;
    }
  | {
      type: 'deleteBlock';
      blockId: string;
    }
  | {
      type: 'insertFragment';
      blockId: string;
      afterFragmentId: string | null;
      fragment: HistoryFragment;
    }
  | {
      type: 'deleteFragment';
      blockId: string;
      fragmentId: string;
    };

interface HistoryVersion {
  id: string;
  time: string;
  actor: HistoryContentSource | null;
  summary: string;
  delta: HistoryDelta[];
}

interface NoteHistoryMockData {
  note: {
    title: string;
    owner: string;
    startedAt: string;
  };
  versions: HistoryVersion[];
}

export interface NoteHistoryState {
  id: string;
  time: string;
  actor: HistoryContentSource | null;
  summary: string;
  preview: NoteAiDiffPreviewData;
  insertedCharacters: number;
  deletedCharacters: number;
  characterCount: number;
  humanCharacterCount: number;
  aiCharacterCount: number;
}

const mockData = historyMockData as NoteHistoryMockData;

function countBlockCharacters(block: HistoryBlock): number {
  return block.fragments.reduce((total, fragment) => total + fragment.text.length, 0);
}

function findBlockIndex(blocks: HistoryBlock[], blockId: string): number {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `版本历史引用了不存在的 block：${blockId}`,
    });
  }
  return index;
}

function findInsertIndex<T extends { id: string }>(items: T[], afterId: string | null): number {
  if (afterId === null) return 0;
  const index = items.findIndex((item) => item.id === afterId);
  if (index < 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `版本历史引用了不存在的插入锚点：${afterId}`,
    });
  }
  return index + 1;
}

function replaceBlockAt(
  blocks: HistoryBlock[],
  blockIndex: number,
  block: HistoryBlock
): HistoryBlock[] {
  const nextBlocks = [...blocks];
  nextBlocks[blockIndex] = block;
  return nextBlocks;
}

function applyDelta(
  blocks: HistoryBlock[],
  delta: HistoryDelta
): { blocks: HistoryBlock[]; inserted: number; deleted: number } {
  if (delta.type === 'insertBlock') {
    const insertIndex = findInsertIndex(blocks, delta.afterBlockId);
    const nextBlocks = [...blocks];
    nextBlocks.splice(insertIndex, 0, {
      ...delta.block,
      fragments: delta.block.fragments.map((fragment) => ({ ...fragment })),
    });
    return { blocks: nextBlocks, inserted: countBlockCharacters(delta.block), deleted: 0 };
  }

  if (delta.type === 'deleteBlock') {
    const blockIndex = findBlockIndex(blocks, delta.blockId);
    const deleted = countBlockCharacters(blocks[blockIndex]);
    return {
      blocks: blocks.filter((block) => block.id !== delta.blockId),
      inserted: 0,
      deleted,
    };
  }

  const blockIndex = findBlockIndex(blocks, delta.blockId);
  const targetBlock = blocks[blockIndex];

  if (delta.type === 'insertFragment') {
    const insertIndex = findInsertIndex(targetBlock.fragments, delta.afterFragmentId);
    const fragments = [...targetBlock.fragments];
    fragments.splice(insertIndex, 0, { ...delta.fragment });
    return {
      blocks: replaceBlockAt(blocks, blockIndex, { ...targetBlock, fragments }),
      inserted: delta.fragment.text.length,
      deleted: 0,
    };
  }

  const fragment = targetBlock.fragments.find((item) => item.id === delta.fragmentId);
  if (!fragment) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `版本历史引用了不存在的 fragment：${delta.fragmentId}`,
    });
  }
  return {
    blocks: replaceBlockAt(blocks, blockIndex, {
      ...targetBlock,
      fragments: targetBlock.fragments.filter((item) => item.id !== delta.fragmentId),
    }),
    inserted: 0,
    deleted: fragment.text.length,
  };
}

function createBlockProps(block: HistoryBlock): Record<string, unknown> {
  const textProps = {
    backgroundColor: 'default',
    textColor: 'default',
    textAlignment: 'left',
  };
  if (block.type !== 'heading') return textProps;
  return {
    ...textProps,
    level: block.level ?? 2,
    isToggleable: false,
  };
}

function toPreviewBlock(block: HistoryBlock): NoteBlockSnapshot {
  return {
    id: block.id,
    type: block.type,
    props: createBlockProps(block),
    content: block.fragments.map((fragment) => ({
      type: 'text',
      text: fragment.text,
      styles: {
        textColor: fragment.source === 'human' ? 'blue' : 'orange',
      },
    })),
    children: [],
  };
}

function createPreview(blocks: HistoryBlock[]): NoteAiDiffPreviewData {
  if (blocks.length > 0) {
    return { content: blocks.map(toPreviewBlock) };
  }
  return {
    content: [
      {
        id: 'history-empty-block',
        type: 'paragraph',
        props: {
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
        },
        content: [],
        children: [],
      },
    ],
  };
}

function countCharactersBySource(blocks: HistoryBlock[], source: HistoryContentSource): number {
  return blocks.reduce(
    (total, block) =>
      total +
      block.fragments.reduce(
        (blockTotal, fragment) =>
          blockTotal + (fragment.source === source ? fragment.text.length : 0),
        0
      ),
    0
  );
}

function buildHistoryStates(): NoteHistoryState[] {
  let blocks: HistoryBlock[] = [];

  return mockData.versions.map((version) => {
    let insertedCharacters = 0;
    let deletedCharacters = 0;
    version.delta.forEach((delta) => {
      const result = applyDelta(blocks, delta);
      blocks = result.blocks;
      insertedCharacters += result.inserted;
      deletedCharacters += result.deleted;
    });

    const humanCharacterCount = countCharactersBySource(blocks, 'human');
    const aiCharacterCount = countCharactersBySource(blocks, 'ai');
    return {
      id: version.id,
      time: version.time,
      actor: version.actor,
      summary: version.summary,
      preview: createPreview(blocks),
      insertedCharacters,
      deletedCharacters,
      characterCount: humanCharacterCount + aiCharacterCount,
      humanCharacterCount,
      aiCharacterCount,
    };
  });
}

export const NOTE_HISTORY_MOCK = mockData.note;
export const NOTE_HISTORY_STATES = buildHistoryStates();
