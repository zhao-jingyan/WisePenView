import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

export type DriveUploadQueuePhase = 'hashing' | 'uploading' | 'confirming' | 'done' | 'failed';

export interface DriveUploadQueueItem {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  phase: DriveUploadQueuePhase;
  progress: number;
  documentId?: string;
  errorMessage?: string;
}

type DriveUploadQueuePatch = Partial<Omit<DriveUploadQueueItem, 'id'>>;

interface DriveUploadQueueState {
  uploads: DriveUploadQueueItem[];
  startUploads: (uploads: DriveUploadQueueItem[]) => void;
  updateUpload: (id: string, patch: DriveUploadQueuePatch) => void;
  removeUpload: (id: string) => void;
}

const initialState = {
  uploads: [] as DriveUploadQueueItem[],
};

export const useDriveUploadQueueStore = create<DriveUploadQueueState>()((set) => ({
  ...initialState,

  startUploads: (uploads) =>
    set((state) => {
      return {
        uploads: [
          ...state.uploads,
          ...uploads.map((upload) => ({
            ...upload,
            progress: clampProgress(upload.progress),
          })),
        ],
      };
    }),

  updateUpload: (id, patch) =>
    set((state) => {
      const normalizedPatch = normalizeUploadPatch(patch);
      return {
        uploads: state.uploads.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                ...normalizedPatch,
              }
            : upload
        ),
      };
    }),

  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((upload) => upload.id !== id),
    })),
}));

const resetDriveUploadQueueStore = (): void => {
  useDriveUploadQueueStore.setState(initialState);
};

registerStore({
  id: 'drive-ui.upload-queue',
  scope: 'tab',
  reset: resetDriveUploadQueueStore,
});

function normalizeUploadPatch(patch: DriveUploadQueuePatch): DriveUploadQueuePatch {
  if (patch.progress == null) {
    return patch;
  }
  return {
    ...patch,
    progress: clampProgress(patch.progress),
  };
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
