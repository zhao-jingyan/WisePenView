import type { BlockSpecs, ExtensionFactoryInstance } from '@blocknote/core';
import { BlockNoteSchema, createExtension } from '@blocknote/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { EditorProps } from '@tiptap/pm/view';
import { ySyncPluginKey } from 'y-prosemirror';

import { isWisePenCommentMarkSyncTransaction } from '../comments/core/commentDocumentMarks';
import type {
  NoteBlockPlugin,
  NoteContentPlugin,
  NoteInlineContentSpecs,
  NoteInlinePlugin,
  NotePluginBundle,
  NotePluginNode,
  NotePluginRegistry,
  NoteRuntimeExtension,
} from './types';

type DOMEventHandlers = NonNullable<EditorProps['handleDOMEvents']>;
type DOMEventName = keyof DOMEventHandlers;
type DOMEventHandler = NonNullable<DOMEventHandlers[DOMEventName]>;

function flattenPluginTree(root: NotePluginBundle): NotePluginNode[] {
  const nodes: NotePluginNode[] = [];
  const visit = (node: NotePluginNode) => {
    nodes.push(node);
    if (node.kind === 'bundle') {
      node.children.forEach(visit);
    }
  };
  visit(root);
  return nodes;
}

function sortByDependencies<T extends { id: string; dependencies?: readonly string[] }>(
  items: readonly T[],
  availableIds: ReadonlySet<string>
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const sorted: T[] = [];

  const visit = (item: T) => {
    if (visited.has(item.id)) return;
    if (visiting.has(item.id)) {
      throw new Error(`Note 插件依赖存在环：${item.id}`);
    }
    visiting.add(item.id);
    for (const dependencyId of item.dependencies ?? []) {
      if (!availableIds.has(dependencyId)) {
        throw new Error(`Note 插件 ${item.id} 缺少依赖：${dependencyId}`);
      }
      const dependency = byId.get(dependencyId);
      if (dependency) visit(dependency);
    }
    visiting.delete(item.id);
    visited.add(item.id);
    sorted.push(item);
  };

  items.forEach(visit);
  return sorted;
}

export function createNotePluginRegistry(
  root: NotePluginBundle,
  runtimeExtensions: readonly NoteRuntimeExtension[] = []
): NotePluginRegistry {
  const nodes = flattenPluginTree(root);
  const allItems = [...nodes, ...runtimeExtensions];
  const seenIds = new Set<string>();
  for (const item of allItems) {
    if (seenIds.has(item.id)) {
      throw new Error(`Note 插件 id 重复：${item.id}`);
    }
    seenIds.add(item.id);
  }

  const contentPlugins = nodes.filter(
    (node): node is NoteContentPlugin => node.kind === 'block' || node.kind === 'inline'
  );
  const sortedContentPlugins = sortByDependencies(contentPlugins, seenIds);
  const sortedRuntimeExtensions = sortByDependencies(runtimeExtensions, seenIds);
  const blockPlugins = new Map<string, NoteBlockPlugin>();
  const inlinePlugins = new Map<string, NoteInlinePlugin>();

  for (const plugin of sortedContentPlugins) {
    const markdownImportSupport = plugin.capabilities.markdownImport.support;
    if (markdownImportSupport === 'custom' && !plugin.markdownImport) {
      throw new Error(`Note 插件 ${plugin.id} 声明自定义 Markdown 导入但未提供 codec`);
    }
    if (markdownImportSupport !== 'custom' && plugin.markdownImport) {
      throw new Error(`Note 插件 ${plugin.id} 提供了 Markdown 导入 codec 但未声明 custom`);
    }

    const owners = plugin.kind === 'block' ? blockPlugins : inlinePlugins;
    const currentOwner = owners.get(plugin.type);
    if (currentOwner) {
      throw new Error(
        `Note ${plugin.kind} type ${plugin.type} 存在多个 owner：${currentOwner.id}、${plugin.id}`
      );
    }
    owners.set(plugin.type, plugin as never);
  }

  return {
    root,
    contentPlugins: sortedContentPlugins,
    blockPlugins,
    inlinePlugins,
    runtimeExtensions: sortedRuntimeExtensions,
  };
}

export function createNoteBlockNoteSchema(registry: NotePluginRegistry) {
  const blockSpecs: BlockSpecs = {};
  const inlineContentSpecs: NoteInlineContentSpecs = {};

  for (const plugin of registry.contentPlugins) {
    if (plugin.kind === 'block') {
      blockSpecs[plugin.type] = plugin.spec;
    } else {
      inlineContentSpecs[plugin.type] = plugin.spec;
    }
  }

  return BlockNoteSchema.create().extend({
    blockSpecs,
    inlineContentSpecs,
  });
}

export function collectNoteEditorExtensions(
  registry: NotePluginRegistry
): ExtensionFactoryInstance[] {
  return [...registry.contentPlugins, ...registry.runtimeExtensions].flatMap(
    (plugin) => plugin.extensions?.() ?? []
  );
}

function isYjsSyncTransaction(tr: Transaction): boolean {
  return tr.getMeta(ySyncPluginKey) !== undefined || tr.getMeta('y-sync$') !== undefined;
}

/** 无协同编辑权时拦截本地 ProseMirror 文档写入（Yjs 同步事务仍放行）。 */
export function createNoteReadOnlyFilterExtension(
  isBlockLocalDocWrites: () => boolean
): ExtensionFactoryInstance {
  return createExtension({
    key: 'noteReadOnlyFilter',
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey('noteReadOnlyFilter'),
        filterTransaction(tr) {
          if (!isBlockLocalDocWrites() || !tr.docChanged) return true;
          if (isYjsSyncTransaction(tr)) return true;
          if (isWisePenCommentMarkSyncTransaction(tr)) return true;
          return false;
        },
      }),
    ],
  });
}

function mergeHandleDOMEvents(
  handlersList: readonly DOMEventHandlers[]
): DOMEventHandlers | undefined {
  if (handlersList.length === 0) return undefined;

  const grouped = new Map<DOMEventName, DOMEventHandler[]>();
  for (const handlers of handlersList) {
    for (const name of Object.keys(handlers) as DOMEventName[]) {
      const handler = handlers[name];
      if (!handler) continue;
      const list = grouped.get(name);
      if (list) list.push(handler);
      else grouped.set(name, [handler]);
    }
  }

  const merged: DOMEventHandlers = {};
  for (const [name, handlers] of grouped) {
    const composed: DOMEventHandler = (view, event) => {
      for (const handler of handlers) {
        if (handler(view, event) === true) return true;
      }
      return false;
    };
    (merged as Record<string, DOMEventHandler>)[name] = composed;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function collectNoteEditorProps(registry: NotePluginRegistry): Partial<EditorProps> {
  const contributors = [...registry.contentPlugins, ...registry.runtimeExtensions];
  const domHandlersList: DOMEventHandlers[] = [];
  const merged: Partial<EditorProps> = {};
  const seenScalarKeys = new Map<string, string>();

  contributors.forEach((contributor) => {
    const props = contributor.editorProps?.();
    if (!props) return;
    for (const key of Object.keys(props) as Array<keyof EditorProps>) {
      const value = props[key];
      if (value === undefined) continue;
      if (key === 'handleDOMEvents') {
        domHandlersList.push(value as DOMEventHandlers);
        continue;
      }
      const previousContributor = seenScalarKeys.get(String(key));
      if (previousContributor) {
        throw new Error(
          `Note editorProps.${String(key)} 存在多个 owner：${previousContributor}、${contributor?.id ?? 'unknown'}`
        );
      }
      seenScalarKeys.set(String(key), contributor?.id ?? 'unknown');
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  const mergedDomHandlers = mergeHandleDOMEvents(domHandlersList);
  if (mergedDomHandlers) merged.handleDOMEvents = mergedDomHandlers;
  return merged;
}
