import { beforeEach, describe, expect, it } from 'vitest';

import { clearNewNoteStore, useNewNoteStore } from './useNewNoteStore';

describe('useNewNoteStore', () => {
  beforeEach(() => clearNewNoteStore());

  it('只允许匹配的资源将待编辑新笔记标记为 dirty', () => {
    const store = useNewNoteStore.getState();
    store.setNewNoteResourceId('note-1');

    store.markNewNoteDirty('note-2');
    expect(useNewNoteStore.getState().newNoteResourceId).toBe('note-1');

    useNewNoteStore.getState().markNewNoteDirty('note-1');
    expect(useNewNoteStore.getState().newNoteResourceId).toBeNull();
  });
});
