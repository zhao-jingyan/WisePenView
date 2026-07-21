import {
  createIncremarkParser,
  type IncremarkParser,
  type IncrementalUpdate,
  type ParsedBlock,
} from '@incremark/core';

export interface MarkdownRenderContext {
  definitions: IncrementalUpdate['definitions'];
  footnoteDefinitions: IncrementalUpdate['footnoteDefinitions'];
  footnoteReferenceOrder: string[];
}

interface MarkdownSnapshot {
  blocks: ParsedBlock[];
  renderContext: MarkdownRenderContext;
}

interface MarkdownRuntime {
  parser: IncremarkParser;
  content: string;
  streaming: boolean;
  snapshot: MarkdownSnapshot;
}

function recordsEqual<T>(left: Record<string, T>, right: Record<string, T>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reuseRenderContext(
  update: IncrementalUpdate,
  previous?: MarkdownRenderContext
): MarkdownRenderContext {
  if (
    previous &&
    recordsEqual(previous.definitions, update.definitions) &&
    recordsEqual(previous.footnoteDefinitions, update.footnoteDefinitions) &&
    arraysEqual(previous.footnoteReferenceOrder, update.footnoteReferenceOrder)
  ) {
    return previous;
  }

  return {
    definitions: update.definitions,
    footnoteDefinitions: update.footnoteDefinitions,
    footnoteReferenceOrder: update.footnoteReferenceOrder,
  };
}

function createSnapshot(
  parser: IncremarkParser,
  update: IncrementalUpdate,
  previous?: MarkdownSnapshot
): MarkdownSnapshot {
  return {
    blocks: [...parser.getCompletedBlocks(), ...update.pending],
    renderContext: reuseRenderContext(update, previous?.renderContext),
  };
}

export function createMarkdownRuntime(content: string, streaming: boolean): MarkdownRuntime {
  const parser = createIncremarkParser({
    gfm: true,
    math: { tex: true },
    containers: false,
    htmlTree: false,
  });
  let update = parser.append(content);
  if (!streaming) update = parser.finalize();

  const snapshot = createSnapshot(parser, update);
  return { parser, content, streaming, snapshot };
}

/** 流式文本保持旧内容前缀时只追加差量；历史替换或重新生成时重建解析状态。 */
export function updateMarkdownRuntime(
  runtime: MarkdownRuntime,
  content: string,
  streaming: boolean
): MarkdownSnapshot | null {
  const contentChanged = content !== runtime.content;
  let update: IncrementalUpdate | null = null;

  if (streaming && !runtime.streaming) {
    runtime.parser.reset();
    update = runtime.parser.append(content);
  } else if (contentChanged) {
    if (runtime.streaming && content.startsWith(runtime.content)) {
      update = runtime.parser.append(content.slice(runtime.content.length));
    } else {
      runtime.parser.reset();
      update = runtime.parser.append(content);
    }
  }

  if (!streaming && (runtime.streaming || contentChanged)) {
    update = runtime.parser.finalize();
  }

  runtime.content = content;
  runtime.streaming = streaming;
  if (!update) return null;

  runtime.snapshot = createSnapshot(runtime.parser, update, runtime.snapshot);
  return runtime.snapshot;
}
