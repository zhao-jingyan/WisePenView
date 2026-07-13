import { defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '.';
import { createNotePluginRegistry } from './registry';
import type {
  NoteBlockPlugin,
  NoteContentCapabilityDeclarations,
  NoteInlinePlugin,
  NotePluginBundle,
  NoteRuntimeExtension,
} from './types';

const defaultCapabilities: NoteContentCapabilityDeclarations = {
  markdownImport: { support: 'default' },
  markdownExport: { support: 'default' },
  aiDiff: { support: 'unsupported', reason: '测试内容不支持' },
  comments: { support: 'unsupported', reason: '测试内容不支持' },
  projection: { support: 'default' },
  print: { support: 'default' },
};

function blockPlugin(id: string, type: string, dependencies?: readonly string[]): NoteBlockPlugin {
  return {
    kind: 'block',
    id,
    type,
    dependencies,
    spec: defaultBlockSpecs.paragraph,
    capabilities: defaultCapabilities,
  };
}

function inlinePlugin(id: string, type: string): NoteInlinePlugin {
  return {
    kind: 'inline',
    id,
    type,
    spec: defaultInlineContentSpecs.text,
    capabilities: defaultCapabilities,
  };
}

function bundle(children: NotePluginBundle['children']): NotePluginBundle {
  return { kind: 'bundle', id: 'root', children };
}

describe('createNotePluginRegistry', () => {
  it('为当前 schema 的每种内容注册唯一 owner', () => {
    expect([...notePluginRegistry.blockPlugins.keys()]).toHaveLength(15);
    expect([...notePluginRegistry.inlinePlugins.keys()]).toHaveLength(8);
    expect(notePluginRegistry.blockPlugins.get('codeBlock')?.id).toBe('codeBlock');
    expect(notePluginRegistry.blockPlugins.get('math')?.id).toBe('latex.block.math');
    expect(notePluginRegistry.inlinePlugins.get('inlineMath')?.id).toBe('latex.inline.inlineMath');
    expect(notePluginRegistry.blockPlugins.get('math')?.markdownImport).toBeDefined();
    expect(notePluginRegistry.inlinePlugins.get('inlineMath')?.markdownImport).toBeDefined();
  });

  it('展开 bundle 并按依赖稳定排序内容 owner', () => {
    const dependent = blockPlugin('dependent', 'dependent', ['base']);
    const base = blockPlugin('base', 'base');
    const registry = createNotePluginRegistry(bundle([dependent, base]));

    expect(registry.contentPlugins.map((plugin) => plugin.id)).toEqual(['base', 'dependent']);
  });

  it('拒绝重复插件 id 和重复内容 type', () => {
    expect(() =>
      createNotePluginRegistry(bundle([blockPlugin('same', 'a'), inlinePlugin('same', 'b')]))
    ).toThrow('Note 插件 id 重复：same');

    expect(() =>
      createNotePluginRegistry(
        bundle([blockPlugin('first', 'same'), blockPlugin('second', 'same')])
      )
    ).toThrow('Note block type same 存在多个 owner：first、second');
  });

  it('拒绝缺失依赖和依赖环', () => {
    expect(() =>
      createNotePluginRegistry(bundle([blockPlugin('orphan', 'orphan', ['missing'])]))
    ).toThrow('Note 插件 orphan 缺少依赖：missing');

    expect(() =>
      createNotePluginRegistry(
        bundle([
          blockPlugin('first', 'first', ['second']),
          blockPlugin('second', 'second', ['first']),
        ])
      )
    ).toThrow('Note 插件依赖存在环：first');
  });

  it('拒绝 Markdown 导入声明与 owner codec 不一致', () => {
    const missingCodec = blockPlugin('missing-codec', 'missingCodec');
    missingCodec.capabilities = {
      ...defaultCapabilities,
      markdownImport: { support: 'custom' },
    };
    expect(() => createNotePluginRegistry(bundle([missingCodec]))).toThrow(
      'Note 插件 missing-codec 声明自定义 Markdown 导入但未提供 codec'
    );

    const undeclaredCodec = blockPlugin('undeclared-codec', 'undeclaredCodec');
    undeclaredCodec.markdownImport = {
      restore: () => undefined,
    };
    expect(() => createNotePluginRegistry(bundle([undeclaredCodec]))).toThrow(
      'Note 插件 undeclared-codec 提供了 Markdown 导入 codec 但未声明 custom'
    );
  });

  it('允许 Runtime extension 依赖内容 owner', () => {
    const runtime: NoteRuntimeExtension = {
      id: 'runtime',
      dependencies: ['base'],
    };
    const registry = createNotePluginRegistry(bundle([blockPlugin('base', 'base')]), [runtime]);

    expect(registry.runtimeExtensions).toEqual([runtime]);
  });
});
