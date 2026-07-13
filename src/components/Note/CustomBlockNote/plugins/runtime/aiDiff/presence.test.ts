import { defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { createNotePluginRegistry } from '../../registry';
import type {
  NoteBlockPlugin,
  NoteContentCapabilityDeclarations,
  NoteInlinePlugin,
  NotePluginBundle,
} from '../../types';
import { hasAiDiffInBlock, shouldFoldAiDiffInlineContent } from './presence';

const unsupportedCapabilities: NoteContentCapabilityDeclarations = {
  markdownImport: { support: 'unsupported', reason: '测试内容不支持' },
  markdownExport: { support: 'unsupported', reason: '测试内容不支持' },
  aiDiff: { support: 'unsupported', reason: '测试内容不支持' },
  projection: { support: 'unsupported', reason: '测试内容不支持' },
  print: { support: 'unsupported', reason: '测试内容不支持' },
};

function createRegistry() {
  const paragraph = {
    kind: 'block',
    id: 'test.block.paragraph',
    type: 'paragraph',
    contentModel: 'inline',
    spec: defaultBlockSpecs.paragraph,
    capabilities: unsupportedCapabilities,
    comments: { documentThreads: 'unsupported' },
  } satisfies NoteBlockPlugin;
  const change = {
    kind: 'inline',
    id: 'test.inline.change',
    type: 'custom-change',
    spec: defaultInlineContentSpecs.text,
    capabilities: { ...unsupportedCapabilities, aiDiff: { support: 'custom' } },
    aiDiff: {
      isPresent: (inline) => inline.changed === true,
      isVisible: (_inline, mode) => mode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY,
      apply: () => undefined,
    },
    comments: { documentThreads: 'unsupported' },
  } satisfies NoteInlinePlugin;
  const root = {
    kind: 'bundle',
    id: 'test',
    children: [paragraph, change],
  } satisfies NotePluginBundle;
  return createNotePluginRegistry(root);
}

describe('AI Diff presence runtime', () => {
  it('递归检查 block，并通过 registry 分发给新增 inline owner', () => {
    const registry = createRegistry();
    expect(
      hasAiDiffInBlock(
        {
          type: 'paragraph',
          content: [],
          children: [
            {
              type: 'paragraph',
              content: [{ type: 'custom-change', changed: true }],
            },
          ],
        },
        registry
      )
    ).toBe(true);
  });

  it('由 inline owner 决定非对比模式下是否折叠整个块', () => {
    const registry = createRegistry();
    const content = [{ type: 'custom-change', changed: true }];
    expect(shouldFoldAiDiffInlineContent(content, AI_DIFF_DISPLAY_MODE.OLD_ONLY, registry)).toBe(
      true
    );
    expect(shouldFoldAiDiffInlineContent(content, AI_DIFF_DISPLAY_MODE.NEW_ONLY, registry)).toBe(
      false
    );
  });
});
