export const DEFAULT_NOTE_RESOURCE_ASIDE_WIDTH = 300;
export const MIN_NOTE_RESOURCE_ASIDE_WIDTH = 280;
const MAX_NOTE_RESOURCE_ASIDE_WIDTH = 560;

const clampWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(width, min), max);

const getMaxNoteResourceAsideWidth = (): number => {
  if (typeof window === 'undefined') return MAX_NOTE_RESOURCE_ASIDE_WIDTH;
  const viewportBasedMax = Math.floor(window.innerWidth * 0.45);
  return Math.max(
    MIN_NOTE_RESOURCE_ASIDE_WIDTH,
    Math.min(MAX_NOTE_RESOURCE_ASIDE_WIDTH, viewportBasedMax)
  );
};

export function normalizeNoteResourceAsideWidth(width: number): number {
  return clampWidth(width, MIN_NOTE_RESOURCE_ASIDE_WIDTH, getMaxNoteResourceAsideWidth());
}
