import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

export interface PdfPreviewProgress {
  page: number;
  zoom: string;
}

const DEFAULT_PDF_PREVIEW_PROGRESS = {
  progressByResourceId: {} as Record<string, PdfPreviewProgress>,
};

type PdfPreviewProgressState = {
  progressByResourceId: Record<string, PdfPreviewProgress>;
  setProgress: (resourceId: string, progress: PdfPreviewProgress) => void;
  removeProgress: (resourceId: string) => void;
};

export const usePdfPreviewProgressStore = create<PdfPreviewProgressState>()(
  persist(
    (set) => ({
      ...DEFAULT_PDF_PREVIEW_PROGRESS,

      setProgress: (resourceId, progress) =>
        set((state) => {
          const prev = state.progressByResourceId[resourceId];
          if (prev != null && prev.page === progress.page && prev.zoom === progress.zoom) {
            return state;
          }
          return {
            progressByResourceId: {
              ...state.progressByResourceId,
              [resourceId]: progress,
            },
          };
        }),

      removeProgress: (resourceId) =>
        set((state) => {
          if (state.progressByResourceId[resourceId] == null) {
            return state;
          }
          const next = { ...state.progressByResourceId };
          delete next[resourceId];
          return { progressByResourceId: next };
        }),
    }),
    { name: 'pdf-preview-progress', storage: zustandSessionStorage }
  )
);

export const clearPdfPreviewProgressStore = (): void => {
  usePdfPreviewProgressStore.setState(DEFAULT_PDF_PREVIEW_PROGRESS);
  usePdfPreviewProgressStore.persist.clearStorage();
};
