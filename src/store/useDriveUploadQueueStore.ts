import { create } from 'zustand';

export type DriveUploadQueuePhase = 'hashing' | 'uploading' | 'confirming' | 'done' | 'failed';

export interface DriveUploadQueueItem {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  phase: DriveUploadQueuePhase;
  progress: number;
  updatedAt?: number;
  phaseStartedAt?: number;
  documentId?: string;
  objectKey?: string;
  errorMessage?: string;
}

type DriveUploadQueuePatch = Partial<
  Omit<DriveUploadQueueItem, 'id' | 'updatedAt' | 'phaseStartedAt'>
>;

interface DriveUploadQueueState {
  uploads: DriveUploadQueueItem[];
  startUploads: (uploads: DriveUploadQueueItem[]) => void;
  updateUpload: (id: string, patch: DriveUploadQueuePatch) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
}

const initialState = {
  uploads: [] as DriveUploadQueueItem[],
};

export const useDriveUploadQueueStore = create<DriveUploadQueueState>()((set) => ({
  ...initialState,

  startUploads: (uploads) =>
    set((state) => {
      const now = Date.now();
      return {
        uploads: [
          ...state.uploads,
          ...uploads.map((upload) => ({
            ...upload,
            progress: clampProgress(upload.progress),
            updatedAt: now,
            phaseStartedAt: now,
          })),
        ],
      };
    }),

  updateUpload: (id, patch) =>
    set((state) => {
      const now = Date.now();
      const normalizedPatch = normalizeUploadPatch(patch);
      return {
        uploads: state.uploads.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                ...normalizedPatch,
                updatedAt: now,
                phaseStartedAt:
                  normalizedPatch.phase != null && normalizedPatch.phase !== upload.phase
                    ? now
                    : (upload.phaseStartedAt ?? now),
              }
            : upload
        ),
      };
    }),

  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((upload) => upload.id !== id),
    })),

  clearUploads: () => set(initialState),
}));

export const clearDriveUploadQueueStore = (): void => {
  useDriveUploadQueueStore.setState(initialState);
};

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
