import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

export type DriveViewMode = 'folder' | 'flat' | 'uploadQueue';

const DEFAULT_DRIVE_PREFERENCES = {
  viewMode: 'folder' as DriveViewMode,
  filterCollapsed: true,
};

type DrivePreferencesState = {
  viewMode: DriveViewMode;
  filterCollapsed: boolean;
  setViewMode: (v: DriveViewMode) => void;
  setFilterCollapsed: (v: boolean) => void;
};

export const useDrivePreferencesStore = create<DrivePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRIVE_PREFERENCES,
      setViewMode: (v) => set({ viewMode: v }),
      setFilterCollapsed: (v) => set({ filterCollapsed: v }),
    }),
    { name: 'drive-preferences', storage: zustandSessionStorage }
  )
);

export const clearDrivePreferencesStore = (): void => {
  useDrivePreferencesStore.setState(DEFAULT_DRIVE_PREFERENCES);
  useDrivePreferencesStore.persist.clearStorage();
};
