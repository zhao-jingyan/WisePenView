import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import type { NoteCommentAnchor } from '../../../content/types';
import {
  findContentCommentAnchor,
  getContentCommentAnchorStores,
  persistContentCommentAnchor,
} from '../../../engines/comments/anchors/content';
import { notePluginRegistry } from '../../../noteEditor';
import { INLINE_MATH_COMMENT_OWNER_ID, MATH_BLOCK_COMMENT_OWNER_ID } from './anchor';

function anchor(value: Record<string, unknown>): NoteCommentAnchor {
  return value;
}

describe('LatexPlugin comments facet', () => {
  it('block 与 inline owner 共享物理 store，但各自解析自己的 anchor', () => {
    const doc = new Y.Doc();
    const blockAnchor = anchor({ kind: 'block', blockId: 'math-1' });
    const inlineAnchor = anchor({ kind: 'inline', blockId: 'p-1', inlineIndex: 0 });

    expect(
      persistContentCommentAnchor(
        doc,
        notePluginRegistry,
        MATH_BLOCK_COMMENT_OWNER_ID,
        'thread-block',
        blockAnchor
      )
    ).toBe(true);
    expect(
      persistContentCommentAnchor(
        doc,
        notePluginRegistry,
        INLINE_MATH_COMMENT_OWNER_ID,
        'thread-inline',
        inlineAnchor
      )
    ).toBe(true);

    expect(getContentCommentAnchorStores(doc, notePluginRegistry)).toHaveLength(1);
    expect(findContentCommentAnchor(doc, notePluginRegistry, 'thread-block')).toMatchObject({
      ownerId: MATH_BLOCK_COMMENT_OWNER_ID,
      anchor: blockAnchor,
    });
    expect(findContentCommentAnchor(doc, notePluginRegistry, 'thread-inline')).toMatchObject({
      ownerId: INLINE_MATH_COMMENT_OWNER_ID,
      anchor: inlineAnchor,
    });
  });

  it('拒绝 owner 不匹配或非法的 anchor payload', () => {
    const doc = new Y.Doc();

    expect(
      persistContentCommentAnchor(
        doc,
        notePluginRegistry,
        MATH_BLOCK_COMMENT_OWNER_ID,
        'thread-invalid-kind',
        anchor({ kind: 'inline', blockId: 'p-1', inlineIndex: 0 })
      )
    ).toBe(false);
    expect(
      persistContentCommentAnchor(
        doc,
        notePluginRegistry,
        INLINE_MATH_COMMENT_OWNER_ID,
        'thread-invalid-index',
        anchor({ kind: 'inline', blockId: 'p-1', inlineIndex: -1 })
      )
    ).toBe(false);
  });
});
