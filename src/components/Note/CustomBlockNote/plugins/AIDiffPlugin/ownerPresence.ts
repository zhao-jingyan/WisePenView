import type { NoteInlineAiDiff } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readProps(content: Record<string, unknown>): Record<string, unknown> {
  const props = content.props;
  return isRecord(props) ? props : content;
}

export function hasAtomicAiDiff(content: Record<string, unknown>): boolean {
  const aiDiffType = readProps(content).aiDiffType;
  return aiDiffType === 'edit' || aiDiffType === 'create' || aiDiffType === 'delete';
}

export const plainInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => false,
};

export const atomicInlineAiDiff: NoteInlineAiDiff = {
  isPresent: hasAtomicAiDiff,
};

export const syntaxInlineAiDiff: NoteInlineAiDiff = {
  isPresent: () => true,
};
