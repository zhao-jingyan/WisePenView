import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import type { NoteAiContentPayload } from '../../content/types';
import { notePluginRegistry } from '../../noteEditorComposition';
import { hashNoteBlockForAiDiff } from '../aiDiff/projection';
import { projectNoteBlocksForMarkdown } from './markdownExport';

describe('projectNoteBlocksForMarkdown', () => {
  it('默认导出 native 正文，newOnly 导出 candidate', () => {
    const block = {
      id: 'paragraph',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: '旧正文', styles: {} }],
      children: [],
    };
    const payload: NoteAiContentPayload = {
      revision: 'r1',
      baseHash: hashNoteBlockForAiDiff(block),
      operation: 'update',
      candidate: {
        props: {},
        content: [
          { type: 'text', text: '新正文 ', styles: {} },
          {
            type: 'link',
            href: '/new',
            content: [{ type: 'text', text: '链接', styles: {} }],
          },
        ],
      },
    };
    const sidecar = new Map([['paragraph', payload]]);

    expect(projectNoteBlocksForMarkdown([block], notePluginRegistry)).toEqual([block]);
    expect(
      projectNoteBlocksForMarkdown(
        [block],
        notePluginRegistry,
        AI_DIFF_DISPLAY_MODE.NEW_ONLY,
        sidecar
      )
    ).toEqual([
      {
        ...block,
        content: [
          { type: 'text', text: '新正文 ', styles: {} },
          {
            type: 'link',
            href: '/new',
            content: [{ type: 'text', text: '链接', styles: {} }],
          },
        ],
      },
    ]);
  });

  it('按 block operation 投影创建和删除', () => {
    const created = {
      id: 'created',
      type: 'paragraph',
      props: {},
      content: [],
      children: [],
    };
    const deleted = {
      id: 'deleted',
      type: 'math',
      props: { expression: 'x', autoEdit: false },
      content: [],
      children: [],
    };
    const sidecar = new Map<string, NoteAiContentPayload>([
      [
        'created',
        {
          revision: 'r-create',
          baseHash: hashNoteBlockForAiDiff(created),
          operation: 'create',
          candidate: {
            props: {},
            content: [{ type: 'text', text: '新增', styles: {} }],
          },
        },
      ],
      [
        'deleted',
        {
          revision: 'r-delete',
          baseHash: hashNoteBlockForAiDiff(deleted),
          operation: 'delete',
          candidate: null,
        },
      ],
    ]);

    expect(
      projectNoteBlocksForMarkdown(
        [created, deleted],
        notePluginRegistry,
        AI_DIFF_DISPLAY_MODE.OLD_ONLY,
        sidecar
      )
    ).toEqual([deleted]);
    expect(
      projectNoteBlocksForMarkdown(
        [created, deleted],
        notePluginRegistry,
        AI_DIFF_DISPLAY_MODE.NEW_ONLY,
        sidecar
      )
    ).toEqual([
      {
        ...created,
        content: [{ type: 'text', text: '新增', styles: {} }],
      },
    ]);
  });
});
