import type { WisePenSidebarComment } from './index.type';

export function formatCommentDate(value: Date): string {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function getVisibleComments(
  comments: WisePenSidebarComment[],
  selected: boolean,
  maxCommentsBeforeCollapse?: number
): { comments: WisePenSidebarComment[]; hiddenCount: number } {
  const displayableComments = comments.filter((comment) => !comment.deleted);
  if (
    !maxCommentsBeforeCollapse ||
    selected ||
    displayableComments.length <= maxCommentsBeforeCollapse
  ) {
    return { comments: displayableComments, hiddenCount: 0 };
  }
  const first = displayableComments[0] ? [displayableComments[0]] : [];
  const lastCount = Math.max(maxCommentsBeforeCollapse - first.length, 0);
  const last = lastCount > 0 ? displayableComments.slice(-lastCount) : [];
  return {
    comments: [...first, ...last],
    hiddenCount: Math.max(displayableComments.length - first.length - last.length, 0),
  };
}
