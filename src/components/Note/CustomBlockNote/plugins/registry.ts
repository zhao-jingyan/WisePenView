import { BlockNoteSchema } from '@blocknote/core';
import type { BlockSpecs, ExtensionFactoryInstance } from '@blocknote/core';
import type { EditorProps } from '@tiptap/pm/view';

import type { NoteEditorPlugin, NoteInlineContentSpecs } from './types';

type DOMEventHandlers = NonNullable<EditorProps['handleDOMEvents']>;
type DOMEventName = keyof DOMEventHandlers;
type DOMEventHandler = NonNullable<DOMEventHandlers[DOMEventName]>;

/**
 * 聚合所有插件的 blockSpecs / inlineContentSpecs，构造 BlockNoteSchema。
 * 运行时合并各插件贡献；类型侧为 BlockNote 默认 schema 宽度（不再做元组字面量推断）。
 */
export function createNoteBlockNoteSchema(plugins: readonly NoteEditorPlugin[]) {
  const blockSpecs: BlockSpecs = {};
  const inlineContentSpecs: NoteInlineContentSpecs = {};

  for (const plugin of plugins) {
    if (plugin.blockSpecs) {
      Object.assign(blockSpecs, plugin.blockSpecs);
    }
    if (plugin.inlineContentSpecs) {
      Object.assign(inlineContentSpecs, plugin.inlineContentSpecs);
    }
  }

  return BlockNoteSchema.create().extend({
    blockSpecs,
    inlineContentSpecs,
  });
}

/** 收集所有插件的 BlockNote / Tiptap extension。 */
export function collectNoteEditorExtensions(
  plugins: readonly NoteEditorPlugin[]
): ExtensionFactoryInstance[] {
  return plugins.flatMap((plugin) => plugin.extensions?.() ?? []);
}

/**
 * 合并相同 DOM 事件名上的多个 handler：按插件顺序串行调用，任一返回 `true` 即短路（与 PM 语义一致）。
 */
function mergeHandleDOMEvents(
  handlersList: readonly DOMEventHandlers[]
): DOMEventHandlers | undefined {
  if (handlersList.length === 0) {
    return undefined;
  }

  const grouped = new Map<DOMEventName, DOMEventHandler[]>();
  for (const handlers of handlersList) {
    for (const name of Object.keys(handlers) as DOMEventName[]) {
      const handler = handlers[name];
      if (!handler) continue;
      const list = grouped.get(name);
      if (list) {
        list.push(handler);
      } else {
        grouped.set(name, [handler]);
      }
    }
  }

  if (grouped.size === 0) {
    return undefined;
  }

  const merged: DOMEventHandlers = {};
  for (const [name, list] of grouped) {
    if (list.length === 1) {
      (merged as Record<string, DOMEventHandler>)[name] = list[0];
      continue;
    }
    const composed: DOMEventHandler = (view, event) => {
      for (const handler of list) {
        if (handler(view, event) === true) {
          return true;
        }
      }
      return false;
    };
    (merged as Record<string, DOMEventHandler>)[name] = composed;
  }
  return merged;
}

/**
 * 合并多个插件贡献的 editorProps：
 * - `handleDOMEvents` 走串行短路
 * - 其它字段后者覆盖前者，发生覆盖时打印 warn 提示冲突
 */
export function collectNoteEditorProps(plugins: readonly NoteEditorPlugin[]): Partial<EditorProps> {
  const propsList = plugins
    .map((plugin) => plugin.editorProps?.())
    .filter((value): value is Partial<EditorProps> => value !== undefined);

  if (propsList.length === 0) {
    return {};
  }

  const domHandlersList: DOMEventHandlers[] = [];
  const merged: Partial<EditorProps> = {};
  const seenScalarKeys = new Set<string>();

  for (const props of propsList) {
    for (const key of Object.keys(props) as Array<keyof EditorProps>) {
      const value = props[key];
      if (value === undefined) continue;
      if (key === 'handleDOMEvents') {
        domHandlersList.push(value as DOMEventHandlers);
        continue;
      }
      if (seenScalarKeys.has(key)) {
        console.warn(`[NoteEditorPlugin] editorProps.${String(key)} 被多个插件贡献，后者覆盖前者`);
      }
      seenScalarKeys.add(key);
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  const mergedDomHandlers = mergeHandleDOMEvents(domHandlersList);
  if (mergedDomHandlers) {
    merged.handleDOMEvents = mergedDomHandlers;
  }
  return merged;
}
