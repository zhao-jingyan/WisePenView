import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

/**
 * 记录用户最后一次从 Drive 打开资源时所在的 scope（个人 / 群组）。
 * 供 SidebarDrive 等下游消费，避免在 note/pdf 视图中再次让用户选择 scope。
 */
interface ActiveDriveScopeState {
  groupId?: string;
  setGroupId: (groupId?: string) => void;
}

const DEFAULT_STATE: Pick<ActiveDriveScopeState, 'groupId'> = {
  groupId: undefined,
};

export const useActiveDriveScopeStore = create<ActiveDriveScopeState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setGroupId: (groupId) => set((state) => (state.groupId === groupId ? state : { groupId })),
    }),
    { name: 'active-drive-scope', storage: zustandSessionStorage }
  )
);

export const clearActiveDriveScopeStore = (): void => {
  useActiveDriveScopeStore.setState(DEFAULT_STATE);
  useActiveDriveScopeStore.persist.clearStorage();
};
