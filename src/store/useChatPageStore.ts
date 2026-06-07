import { create } from 'zustand';

export interface ActiveDocRef {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface ActiveAttachment {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface PendingImageMeta {
  id: string;
  mimeType: string;
  filename: string;
  thumbnailUrl: string;
}

export interface PendingAttachmentUpload {
  id: string;
  filename: string;
  status: 'uploading' | 'failed';
  errorMessage?: string;
}

interface ChatPageState {
  activeDocRefs: ActiveDocRef[];
  activeAttachments: ActiveAttachment[];
  pendingImageMetas: PendingImageMeta[];
  pendingAttachmentUploads: PendingAttachmentUpload[];

  addDocRef: (ref: ActiveDocRef) => void;
  removeDocRef: (resourceId: string) => void;
  setDocRefEnabled: (resourceId: string, enabled: boolean) => void;
  addAttachment: (att: ActiveAttachment) => void;
  removeAttachment: (attachmentId: string) => void;
  setAttachmentEnabled: (attachmentId: string, enabled: boolean) => void;

  addPendingImage: (meta: PendingImageMeta) => void;
  removePendingImage: (id: string) => void;
  clearPendingImageMetas: () => void;

  addPendingAttachmentUpload: (upload: PendingAttachmentUpload) => void;
  updatePendingAttachmentUpload: (id: string, patch: Partial<PendingAttachmentUpload>) => void;
  removePendingAttachmentUpload: (id: string) => void;
  clearPendingAttachmentUploads: () => void;

  autoSaveToLibrary: boolean;
  setAutoSaveToLibrary: (value: boolean) => void;
}

const initialState = {
  activeDocRefs: [],
  activeAttachments: [],
  pendingImageMetas: [],
  pendingAttachmentUploads: [],
  autoSaveToLibrary: false,
};

export const useChatPageStore = create<ChatPageState>()((set) => ({
  ...initialState,

  addDocRef: (ref) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.some((r) => r.resourceId === ref.resourceId)
        ? state.activeDocRefs
        : [...state.activeDocRefs, ref],
    })),

  removeDocRef: (resourceId) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.filter((r) => r.resourceId !== resourceId),
    })),

  setDocRefEnabled: (resourceId, enabled) =>
    set((state) => ({
      activeDocRefs: state.activeDocRefs.map((r) =>
        r.resourceId === resourceId ? { ...r, enabled } : r
      ),
    })),

  addAttachment: (att) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.some((a) => a.attachmentId === att.attachmentId)
        ? state.activeAttachments
        : [...state.activeAttachments, att],
    })),

  removeAttachment: (attachmentId) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.filter((a) => a.attachmentId !== attachmentId),
    })),

  setAttachmentEnabled: (attachmentId, enabled) =>
    set((state) => ({
      activeAttachments: state.activeAttachments.map((a) =>
        a.attachmentId === attachmentId ? { ...a, enabled } : a
      ),
    })),

  addPendingImage: (meta) =>
    set((state) => ({
      pendingImageMetas: [...state.pendingImageMetas, meta],
    })),

  removePendingImage: (id) =>
    set((state) => ({
      pendingImageMetas: state.pendingImageMetas.filter((m) => m.id !== id),
    })),

  clearPendingImageMetas: () => set({ pendingImageMetas: [] }),

  addPendingAttachmentUpload: (upload) =>
    set((state) => ({
      pendingAttachmentUploads: [...state.pendingAttachmentUploads, upload],
    })),

  updatePendingAttachmentUpload: (id, patch) =>
    set((state) => ({
      pendingAttachmentUploads: state.pendingAttachmentUploads.map((u) =>
        u.id === id ? { ...u, ...patch } : u
      ),
    })),

  removePendingAttachmentUpload: (id) =>
    set((state) => ({
      pendingAttachmentUploads: state.pendingAttachmentUploads.filter((u) => u.id !== id),
    })),

  clearPendingAttachmentUploads: () => set({ pendingAttachmentUploads: [] }),

  autoSaveToLibrary: false,
  setAutoSaveToLibrary: (value) => set({ autoSaveToLibrary: value }),
}));

export const clearChatPageStore = (): void => {
  useChatPageStore.setState({
    activeDocRefs: [],
    activeAttachments: [],
    pendingImageMetas: [],
    pendingAttachmentUploads: [],
    autoSaveToLibrary: false,
  });
};
