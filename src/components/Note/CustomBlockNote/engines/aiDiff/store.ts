import type * as Y from 'yjs';

import type { NoteAiContentPayload } from '../../content/types';

const AI_CONTENT_STORE_MAP = 'ai-content-store';
export const AI_DIFF_ACTION_ORIGIN = Symbol('ai-diff-action');

type AiContentMutationResult = 'applied' | 'missing' | 'stale';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNoteAiContentPayload(value: unknown): value is NoteAiContentPayload {
  if (!isRecord(value)) return false;
  if (typeof value.revision !== 'string' || !value.revision) return false;
  if (typeof value.baseHash !== 'string' || !value.baseHash) return false;
  if (!['create', 'update', 'delete'].includes(String(value.operation))) return false;
  if (value.operation === 'delete') return value.candidate === null;
  if (!isRecord(value.candidate)) return false;
  return (
    isRecord(value.candidate.props) &&
    Object.prototype.hasOwnProperty.call(value.candidate, 'content')
  );
}

export function getAiContentStore(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(AI_CONTENT_STORE_MAP);
}

export function readBlockAiContent(doc: Y.Doc, blockId: string): NoteAiContentPayload | null {
  const value = getAiContentStore(doc).get(blockId);
  return isNoteAiContentPayload(value) ? value : null;
}

export function readAllAiContent(doc: Y.Doc): ReadonlyMap<string, NoteAiContentPayload> {
  const result = new Map<string, NoteAiContentPayload>();
  getAiContentStore(doc).forEach((value, blockId) => {
    if (isNoteAiContentPayload(value)) result.set(blockId, value);
  });
  return result;
}

export function clearBlockAiContent(
  doc: Y.Doc,
  blockId: string,
  expectedRevision: string
): AiContentMutationResult {
  let result: AiContentMutationResult = 'missing';
  doc.transact(() => {
    const current = readBlockAiContent(doc, blockId);
    if (!current) return;
    if (current.revision !== expectedRevision) {
      result = 'stale';
      return;
    }
    getAiContentStore(doc).delete(blockId);
    result = 'applied';
  }, AI_DIFF_ACTION_ORIGIN);
  return result;
}

export function clearAiContentEntries(doc: Y.Doc, blockIds: readonly string[]): void {
  doc.transact(() => {
    const store = getAiContentStore(doc);
    blockIds.forEach((blockId) => store.delete(blockId));
  }, AI_DIFF_ACTION_ORIGIN);
}

export function observeAiContent(doc: Y.Doc, listener: () => void): () => void {
  const store = getAiContentStore(doc);
  store.observe(listener);
  return () => store.unobserve(listener);
}
