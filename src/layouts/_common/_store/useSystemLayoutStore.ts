import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

interface SystemLayoutState {
  appSidebarWidth: number;
  adminSidebarWidth: number;
  setAppSidebarWidth: (width: number) => void;
  setAdminSidebarWidth: (width: number) => void;
}

const DEFAULT_SYSTEM_LAYOUT_STATE = {
  appSidebarWidth: 308,
  adminSidebarWidth: 308,
};

const setWidth =
  <K extends keyof typeof DEFAULT_SYSTEM_LAYOUT_STATE>(key: K, width: number) =>
  (state: SystemLayoutState): Partial<SystemLayoutState> | SystemLayoutState => {
    if (state[key] === width) {
      return state;
    }
    return { [key]: width } as Pick<SystemLayoutState, K>;
  };

export const useSystemLayoutStore = create<SystemLayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_SYSTEM_LAYOUT_STATE,
      setAppSidebarWidth: (width) => set((state) => setWidth('appSidebarWidth', width)(state)),
      setAdminSidebarWidth: (width) => set((state) => setWidth('adminSidebarWidth', width)(state)),
    }),
    { name: 'system-layout', storage: createStoreJSONStorage('tab') }
  )
);

const resetSystemLayoutStore = (): void => {
  useSystemLayoutStore.setState(DEFAULT_SYSTEM_LAYOUT_STATE);
};

registerStore({
  id: 'layout.system-layout',
  scope: 'tab',
  reset: resetSystemLayoutStore,
});
