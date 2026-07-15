import type { WisePenInlineCommentData } from './index.type';

export function formatInlineCommentDate(value: Date): string {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function getVisibleInlineComments(
  inlineComments: WisePenInlineCommentData[],
  selected: boolean,
  maxInlineCommentsBeforeCollapse?: number
): { inlineComments: WisePenInlineCommentData[]; hiddenCount: number } {
  const displayableInlineComments = inlineComments.filter(
    (inlineComment) => !inlineComment.deleted
  );
  if (
    !maxInlineCommentsBeforeCollapse ||
    selected ||
    displayableInlineComments.length <= maxInlineCommentsBeforeCollapse
  ) {
    return { inlineComments: displayableInlineComments, hiddenCount: 0 };
  }
  const first = displayableInlineComments[0] ? [displayableInlineComments[0]] : [];
  const lastCount = Math.max(maxInlineCommentsBeforeCollapse - first.length, 0);
  const last = lastCount > 0 ? displayableInlineComments.slice(-lastCount) : [];
  return {
    inlineComments: [...first, ...last],
    hiddenCount: Math.max(displayableInlineComments.length - first.length - last.length, 0),
  };
}
