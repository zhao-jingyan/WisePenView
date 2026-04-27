import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDisplayBase } from '@/types/user';

import { zustandSessionStorage } from './sessionStorage';
import { usePdfPreviewProgressStore } from './usePdfPreviewProgressStore';
import { useNewNoteStore } from './useNewNoteStore';

export interface RecentFileItem {
  resourceId: string;
  resourceName: string;
  ownerInfo: UserDisplayBase;
  resourceType?: string;
}

type RecentFilesState = {
  items: RecentFileItem[];
  addFile: (item: RecentFileItem) => void;
  removeFile: (resourceId: string) => void;
  updateFileName: (resourceId: string, resourceName: string) => void;
};

const DEFAULT_RECENT_FILES_STATE = {
  items: [] as RecentFileItem[],
};

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set) => ({
      ...DEFAULT_RECENT_FILES_STATE,

      addFile: (item) =>
        set((state) => {
          // 查找是否已存在同 resourceId 的文件
          const existIndex = state.items.findIndex((i) => i.resourceId === item.resourceId);
          if (existIndex >= 0) {
            // 如已存在，则更新 resourceName / resourceType，移动到原有顺序保持不变
            const next = [...state.items];
            next[existIndex] = {
              ...next[existIndex],
              resourceName: item.resourceName,
              ownerInfo: item.ownerInfo,
              resourceType: item.resourceType,
            };
            return { items: next };
          }

          return { items: [...state.items, item] };
        }),

      removeFile: (resourceId) =>
        set((state) => {
          usePdfPreviewProgressStore.getState().removeProgress(resourceId);
          useNewNoteStore.getState().clearNewNoteResourceId(resourceId);
          return {
            items: state.items.filter((i) => i.resourceId !== resourceId),
          };
        }),

      updateFileName: (resourceId, resourceName) =>
        set((state) => ({
          items: state.items.map((i) => (i.resourceId === resourceId ? { ...i, resourceName } : i)),
        })),
    }),
    { name: 'recent-files', storage: zustandSessionStorage }
  )
);

export const clearRecentFilesStore = (): void => {
  useRecentFilesStore.setState(DEFAULT_RECENT_FILES_STATE);
  useRecentFilesStore.persist.clearStorage();
};
