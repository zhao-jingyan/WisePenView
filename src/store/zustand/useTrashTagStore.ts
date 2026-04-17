import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeTagGroupId } from '@/utils/normalizeTagGroupId';

import { zustandSessionStorage } from './sessionStorage';

const DEFAULT_GROUP_KEY = '__default__';

type TrashTagState = {
  trashTagIdByGroup: Record<string, string>;
  setTrashTagId: (groupId: string | undefined, tagId: string | undefined) => void;
  getTrashTagId: (groupId?: string) => string | undefined;
  clearTrashTagId: (groupId?: string) => void;
};

const DEFAULT_TRASH_TAG_STATE = {
  trashTagIdByGroup: {} as Record<string, string>,
};

const resolveGroupKey = (groupId?: string): string =>
  normalizeTagGroupId(groupId) ?? DEFAULT_GROUP_KEY;

export const useTrashTagStore = create<TrashTagState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TRASH_TAG_STATE,
      setTrashTagId: (groupId, tagId) => {
        const groupKey = resolveGroupKey(groupId);
        set((state) => {
          if (!tagId) {
            const next = { ...state.trashTagIdByGroup };
            delete next[groupKey];
            return { trashTagIdByGroup: next };
          }
          return {
            trashTagIdByGroup: {
              ...state.trashTagIdByGroup,
              [groupKey]: tagId,
            },
          };
        });
      },
      getTrashTagId: (groupId) => {
        const groupKey = resolveGroupKey(groupId);
        return get().trashTagIdByGroup[groupKey];
      },
      clearTrashTagId: (groupId) => {
        if (groupId === undefined) {
          set({ trashTagIdByGroup: {} });
          return;
        }
        const groupKey = resolveGroupKey(groupId);
        set((state) => {
          const next = { ...state.trashTagIdByGroup };
          delete next[groupKey];
          return { trashTagIdByGroup: next };
        });
      },
    }),
    { name: 'trash-tag', storage: zustandSessionStorage }
  )
);

export const clearTrashTagStore = (): void => {
  useTrashTagStore.setState(DEFAULT_TRASH_TAG_STATE);
  useTrashTagStore.persist.clearStorage();
};
