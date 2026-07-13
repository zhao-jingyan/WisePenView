import type { NotePluginRegistry } from '../../types';
import { hashStableValue } from './stableValue';

export type AiGeneratedBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function normalizeGeneratedBlocks(
  input: unknown,
  seed: string,
  path: string,
  registry: NotePluginRegistry
): unknown[] | null {
  if (!Array.isArray(input)) return null;
  const blocks: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const source = input[index];
    if (!isRecord(source)) return null;
    const id = stringValue(source.id);
    const type = stringValue(source.type);
    if (!id || !type) return null;

    const owner = registry.blockPlugins.get(type);
    if (!owner?.aiDiff) return null;
    const keyPrefix = `${seed}:${path}:${id}:${index}`;
    const projection = owner.aiDiff.normalizeGenerated(
      {
        props: recordValue(source.props),
        content: source.content,
        keyPrefix,
      },
      registry
    );
    if (!projection) return null;

    const children = normalizeGeneratedBlocks(
      Array.isArray(source.children) ? source.children : [],
      seed,
      `${path}.${id}.${index}`,
      registry
    );
    if (!children) return null;

    blocks.push({
      id,
      type,
      props: projection.props,
      ...('content' in projection ? { content: projection.content } : {}),
      children,
    });
  }
  return blocks;
}

export function normalizeAiGeneratedBlocks(
  input: unknown,
  registry: NotePluginRegistry
): unknown[] | null {
  return normalizeGeneratedBlocks(input, `ai-${hashStableValue(input)}`, 'root', registry);
}
