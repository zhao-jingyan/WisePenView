export const DEFAULT_COMMENTS_SIDEBAR_WIDTH = 300;
export const MIN_COMMENTS_SIDEBAR_WIDTH = 280;
const MAX_COMMENTS_SIDEBAR_WIDTH = 560;

export function normalizeCommentsSidebarWidth(width: number): number {
  const viewportMax =
    typeof window === 'undefined'
      ? MAX_COMMENTS_SIDEBAR_WIDTH
      : Math.floor(window.innerWidth * 0.45);
  const maxWidth = Math.max(
    MIN_COMMENTS_SIDEBAR_WIDTH,
    Math.min(MAX_COMMENTS_SIDEBAR_WIDTH, viewportMax)
  );
  return Math.min(Math.max(width, MIN_COMMENTS_SIDEBAR_WIDTH), maxWidth);
}
