import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import type { NoteMarkdownExportProjection } from '../types';
import { createAiChangeInlineAiDiff } from './aiDiff';

type AiDiffAction = 'accept' | 'discard';

function modeToAction(mode: string): AiDiffAction | null {
  if (mode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return 'accept';
  if (mode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return 'discard';
  return null;
}

export function createAiDiffSyntaxMarkdownExport(type: string): NoteMarkdownExportProjection {
  const aiDiff = createAiChangeInlineAiDiff(type);
  return {
    project(node, context) {
      const action = modeToAction(context.aiDiffDisplayMode);
      if (!action) return node;
      return aiDiff.apply(node, action)?.[0] ?? null;
    },
  };
}
