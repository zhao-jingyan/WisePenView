import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

import type { CustomBlockNoteEditor } from '../../noteEditorComposition';

const ESC = '\u001b';

export interface NoteTransactionRange {
  from: number;
  to: number;
}

export interface NoteTransactionSummary {
  docChanged: boolean;
  ranges: readonly NoteTransactionRange[];
  changedBlockIds: readonly string[];
  removedBlockIds: readonly string[];
  changedText: string;
  hasDollar: boolean;
  hasEscape: boolean;
  structureChanged: boolean;
  requiresFullRebuild: boolean;
}

interface BlockRef {
  id: string;
  type: string;
  attrs: Record<string, unknown>;
  from: number;
}

const transactionSummaryCache = new WeakMap<Transaction, NoteTransactionSummary>();

function clampPosition(position: number, doc: PMNode): number {
  return Math.max(0, Math.min(position, doc.content.size));
}

function mergeRanges(ranges: readonly NoteTransactionRange[]): NoteTransactionRange[] {
  const sorted = ranges
    .map((range) => ({ from: Math.min(range.from, range.to), to: Math.max(range.from, range.to) }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const merged: NoteTransactionRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.from > previous.to) {
      merged.push(range);
      continue;
    }
    previous.to = Math.max(previous.to, range.to);
  }
  return merged;
}

export function collectBlockContainerNodes(
  doc: PMNode,
  ranges: readonly NoteTransactionRange[]
): Array<{ node: PMNode; pos: number }> {
  const nodes = new Map<number, PMNode>();
  const addNode = (node: PMNode, from: number) => {
    if (node.type.name !== 'blockContainer') return;
    nodes.set(from, node);
  };

  for (const range of ranges) {
    const from = clampPosition(range.from, doc);
    const to = clampPosition(Math.max(range.to, from), doc);
    if (from === to) {
      if (doc.content.size === 0) continue;
      const resolved = doc.resolve(Math.min(from, Math.max(doc.content.size - 1, 0)));
      for (let depth = resolved.depth; depth >= 0; depth -= 1) {
        addNode(resolved.node(depth), depth === 0 ? 0 : resolved.before(depth));
      }
      continue;
    }
    doc.nodesBetween(from, to, (node, pos) => {
      addNode(node, pos);
      return true;
    });
  }
  return [...nodes.entries()].map(([pos, node]) => ({ node, pos }));
}

function collectBlockRefs(doc: PMNode, ranges: readonly NoteTransactionRange[]): BlockRef[] {
  return collectBlockContainerNodes(doc, ranges).flatMap(({ node, pos }) => {
    const id = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    if (!id) return [];
    return [
      {
        id,
        type: node.type.name,
        attrs: (node.attrs ?? {}) as Record<string, unknown>,
        from: pos,
      },
    ];
  });
}

function readChangedRanges(transaction: Transaction): {
  oldRanges: NoteTransactionRange[];
  newRanges: NoteTransactionRange[];
} {
  const oldRanges: NoteTransactionRange[] = [];
  const newRanges: NoteTransactionRange[] = [];
  transaction.mapping.maps.forEach((map, index) => {
    const beforeMapping = transaction.mapping.slice(0, index).invert();
    const afterMapping = transaction.mapping.slice(index + 1);
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      oldRanges.push({
        from: beforeMapping.map(oldStart, 1),
        to: beforeMapping.map(oldEnd, -1),
      });
      newRanges.push({
        from: afterMapping.map(newStart, 1),
        to: afterMapping.map(newEnd, -1),
      });
    });
  });
  return { oldRanges: mergeRanges(oldRanges), newRanges: mergeRanges(newRanges) };
}

function readText(doc: PMNode, ranges: readonly NoteTransactionRange[]): string {
  return ranges
    .map((range) => {
      const from = clampPosition(range.from, doc);
      const to = clampPosition(Math.max(range.to, from), doc);
      return from === to ? '' : doc.textBetween(from, to, '\n', '\n');
    })
    .join('\n');
}

function sameAttrs(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

function hasStructuralDifference(
  previous: readonly BlockRef[],
  current: readonly BlockRef[]
): boolean {
  const previousById = new Map(previous.map((ref) => [ref.id, ref]));
  const currentById = new Map(current.map((ref) => [ref.id, ref]));
  if (previousById.size !== currentById.size) return true;
  if (
    previous.map((ref) => ref.id).join('\u0000') !== current.map((ref) => ref.id).join('\u0000')
  ) {
    return true;
  }
  for (const [id, previousRef] of previousById) {
    const currentRef = currentById.get(id);
    if (
      !currentRef ||
      previousRef.type !== currentRef.type ||
      !sameAttrs(previousRef.attrs, currentRef.attrs)
    ) {
      return true;
    }
  }
  return false;
}

function summarizeTransaction(transaction: Transaction): NoteTransactionSummary {
  const empty: NoteTransactionSummary = {
    docChanged: false,
    ranges: [],
    changedBlockIds: [],
    removedBlockIds: [],
    changedText: '',
    hasDollar: false,
    hasEscape: false,
    structureChanged: false,
    requiresFullRebuild: false,
  };
  if (!transaction.docChanged) return empty;

  const { oldRanges, newRanges } = readChangedRanges(transaction);
  if (oldRanges.length === 0 && newRanges.length === 0) {
    return { ...empty, docChanged: true };
  }

  const previousBlocks = collectBlockRefs(transaction.before, oldRanges);
  const currentBlocks = collectBlockRefs(transaction.doc, newRanges);
  const previousIds = new Set(previousBlocks.map((block) => block.id));
  const currentIds = new Set(currentBlocks.map((block) => block.id));
  const changedBlockIds = currentBlocks.map((block) => block.id);
  const removedBlockIds = previousBlocks
    .map((block) => block.id)
    .filter((id) => !currentIds.has(id));
  const changedText = `${readText(transaction.before, oldRanges)}\n${readText(
    transaction.doc,
    newRanges
  )}`;
  const structureChanged =
    previousIds.size !== currentIds.size || hasStructuralDifference(previousBlocks, currentBlocks);

  return {
    docChanged: true,
    ranges: newRanges,
    changedBlockIds,
    removedBlockIds,
    changedText,
    hasDollar: changedText.includes('$'),
    hasEscape: changedText.includes(ESC),
    structureChanged,
    requiresFullRebuild:
      newRanges.length > 32 || changedBlockIds.length + removedBlockIds.length > 64,
  };
}

export function summarizeNoteTransactions(
  transactions: readonly Transaction[]
): NoteTransactionSummary {
  const summaries = transactions.map((transaction) => {
    const cached = transactionSummaryCache.get(transaction);
    if (cached) return cached;
    const summary = summarizeTransaction(transaction);
    transactionSummaryCache.set(transaction, summary);
    return summary;
  });
  const changedBlockIds = new Set<string>();
  const removedBlockIds = new Set<string>();
  const ranges: NoteTransactionRange[] = [];
  let changedText = '';
  let structureChanged = false;
  let requiresFullRebuild = false;
  for (const summary of summaries) {
    if (!summary.docChanged) continue;
    summary.changedBlockIds.forEach((id) => changedBlockIds.add(id));
    summary.removedBlockIds.forEach((id) => removedBlockIds.add(id));
    ranges.push(...summary.ranges);
    changedText += `${summary.changedText}\n`;
    structureChanged ||= summary.structureChanged;
    requiresFullRebuild ||= summary.requiresFullRebuild;
  }
  const mergedRanges = mergeRanges(ranges);
  return {
    docChanged: summaries.some((summary) => summary.docChanged),
    ranges: mergedRanges,
    changedBlockIds: [...changedBlockIds],
    removedBlockIds: [...removedBlockIds],
    changedText,
    hasDollar: changedText.includes('$'),
    hasEscape: changedText.includes(ESC),
    structureChanged,
    requiresFullRebuild,
  };
}

export function subscribeToNoteTransactions(
  editor: CustomBlockNoteEditor,
  listener: (summary: NoteTransactionSummary) => void
): () => void {
  const handleUpdate = ({
    transaction,
    appendedTransactions,
  }: {
    transaction: Transaction;
    appendedTransactions: Transaction[];
  }) => {
    listener(summarizeNoteTransactions([transaction, ...appendedTransactions]));
  };
  editor._tiptapEditor.on('update', handleUpdate);
  return () => editor._tiptapEditor.off('update', handleUpdate);
}
