import { defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { notePluginRegistry } from '.';
import {
  collectNotePrintStyles,
  createDefaultNoteBlock,
  createNotePluginRegistry,
} from './registry';
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
  projection: { support: 'default' },
  print: { support: 'default' },
};

function blockPlugin(id: string, type: string, dependencies?: readonly string[]): NoteBlockPlugin {
  return {
    kind: 'block',
    id,
    type,
    contentModel: 'inline',
    dependencies,
    spec: defaultBlockSpecs.paragraph,
    capabilities: defaultCapabilities,
    comments: { documentThreads: 'unsupported' },
  };
}

function inlinePlugin(id: string, type: string): NoteInlinePlugin {
  return {
    kind: 'inline',
    id,
    type,
    spec: defaultInlineContentSpecs.text,
    capabilities: defaultCapabilities,
    aiDiff: { isPresent: () => false, isVisible: () => true, apply: () => undefined },
    comments: { documentThreads: 'range' },
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

  it('拒绝缺失 comments policy 的内容 owner', () => {
    const missing = blockPlugin('missing-comments', 'missingComments');
    delete (missing as Partial<NoteBlockPlugin>).comments;

    expect(() => createNotePluginRegistry(bundle([missing]))).toThrow(
      'Note 插件 missing-comments 未声明 comments policy'
    );
  });

  it('由唯一 block owner 提供默认插入块', () => {
    const owner = blockPlugin('default-block', 'defaultBlock');
    owner.insertion = { default: true, createEmpty: () => ({ type: 'defaultBlock' }) };
    const registry = createNotePluginRegistry(bundle([owner]));

    expect(createDefaultNoteBlock(registry)).toEqual({ type: 'defaultBlock' });

    const second = blockPlugin('second-default', 'secondDefault');
    second.insertion = { default: true, createEmpty: () => ({ type: 'secondDefault' }) };
    expect(() => createNotePluginRegistry(bundle([owner, second]))).toThrow(
      'Note 默认插入 block 存在多个 owner：second-default'
    );
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
      'Note 插件 missing-codec 的 Markdown 导入：声明为 custom，但未提供实现'
    );

    const undeclaredCodec = blockPlugin('undeclared-codec', 'undeclaredCodec');
    undeclaredCodec.markdownImport = {
      restore: () => undefined,
    };
    expect(() => createNotePluginRegistry(bundle([undeclaredCodec]))).toThrow(
      'Note 插件 undeclared-codec 提供了 Markdown 导入 实现，但未声明为 custom'
    );
  });

  it('拒绝 Markdown 导出与 AI Diff 的声明实现不一致', () => {
    const missingExport = blockPlugin('missing-export', 'missingExport');
    missingExport.capabilities = {
      ...defaultCapabilities,
      markdownExport: { support: 'custom' },
    };
    expect(() => createNotePluginRegistry(bundle([missingExport]))).toThrow(
      'Note 插件 missing-export 的 Markdown 导出：声明为 custom，但未提供实现'
    );

    const missingAiDiff = blockPlugin('missing-ai-diff', 'missingAiDiff');
    missingAiDiff.capabilities = {
      ...defaultCapabilities,
      aiDiff: { support: 'custom' },
    };
    expect(() => createNotePluginRegistry(bundle([missingAiDiff]))).toThrow(
      'Note 插件 missing-ai-diff 的 AI Diff：声明为 custom，但未提供实现'
    );

    const missingInheritedAiDiff = blockPlugin('missing-inherited-ai-diff', 'inheritedAiDiff');
    missingInheritedAiDiff.capabilities = {
      ...defaultCapabilities,
      aiDiff: { support: 'inherited', profile: 'richTextBlock' },
    };
    expect(() => createNotePluginRegistry(bundle([missingInheritedAiDiff]))).toThrow(
      'Note 插件 missing-inherited-ai-diff 的 AI Diff：声明为 inherited，但未提供实现'
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

  it('校验 AI Diff runtime 的 plain text owner adapter 唯一且存在', () => {
    const requiresText: NoteRuntimeExtension = {
      id: 'ai-diff-runtime',
      requiresAiDiffText: true,
    };
    expect(() =>
      createNotePluginRegistry(bundle([blockPlugin('base', 'base')]), [requiresText])
    ).toThrow('Note AI Diff runtime 缺少 plain text owner adapter');

    const first = inlinePlugin('first-text', 'firstText');
    first.capabilities = {
      ...defaultCapabilities,
      aiDiff: { support: 'inherited', profile: 'testText' },
    };
    first.aiDiff.generatedText = {
      read: () => undefined,
      create: () => ({ type: 'firstText' }),
    };
    const second = inlinePlugin('second-text', 'secondText');
    second.capabilities = {
      ...defaultCapabilities,
      aiDiff: { support: 'inherited', profile: 'testText' },
    };
    second.aiDiff.generatedText = {
      read: () => undefined,
      create: () => ({ type: 'secondText' }),
    };
    expect(() => createNotePluginRegistry(bundle([first, second]))).toThrow(
      'Note AI Diff plain text adapter 存在多个 owner：second-text'
    );
  });

  it('去重并组合内容 owner 与 Runtime extension 的打印样式', () => {
    const owner = blockPlugin('base', 'base');
    owner.capabilities = { ...defaultCapabilities, print: { support: 'custom' } };
    owner.print = { styles: ['.base { display: block; }', '.shared { color: red; }'] };
    const runtime: NoteRuntimeExtension = {
      id: 'runtime',
      print: { styles: ['.shared { color: red; }', '  .runtime { display: none; }  '] },
    };
    const registry = createNotePluginRegistry(bundle([owner]), [runtime]);

    expect(collectNotePrintStyles(registry)).toBe(
      '.base { display: block; }\n.shared { color: red; }\n.runtime { display: none; }'
    );
  });
});
