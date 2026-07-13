import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

import type { NoteAiContentPayload } from '../../content/types';
import {
  clearBlockAiContent,
  getAiContentStore,
  observeAiContent,
  readAllAiContent,
  readBlockAiContent,
} from './store';

const payload: NoteAiContentPayload = {
  revision: 'r1',
  baseHash: 'base-1',
  operation: 'update',
  candidate: { props: {}, content: [] },
};

describe('AI-content sidecar store', () => {
  it('无 key 时逻辑字段为 null，并忽略非法 payload', () => {
    const doc = new Y.Doc();
    expect(readBlockAiContent(doc, 'missing')).toBeNull();
    doc.getMap('ai-content-store').set('invalid', { revision: 'r1' });
    expect(readAllAiContent(doc).size).toBe(0);
  });

  it('按 revision 清理候选', () => {
    const doc = new Y.Doc();
    getAiContentStore(doc).set('block-1', payload);
    expect(readBlockAiContent(doc, 'block-1')).toEqual(payload);
    expect(clearBlockAiContent(doc, 'block-1', 'old')).toBe('stale');
    expect(clearBlockAiContent(doc, 'block-1', 'r1')).toBe('applied');
    expect(readBlockAiContent(doc, 'block-1')).toBeNull();
  });

  it('独立观察 sidecar 变化', () => {
    const doc = new Y.Doc();
    const listener = vi.fn();
    const unobserve = observeAiContent(doc, listener);
    getAiContentStore(doc).set('block-1', payload);
    expect(listener).toHaveBeenCalledTimes(1);
    unobserve();
    getAiContentStore(doc).set('block-2', payload);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
