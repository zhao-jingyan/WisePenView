import { create } from 'zustand';

interface NewNoteState {
  newNoteResourceId: string | null;
  /** 与当前 new 笔记标题编辑器内容绑定：trim 后无字为 true */
  isTitleEmpty: boolean;
  /** 与当前 new 笔记正文编辑器内容绑定：trim 后无字为 true */
  isNoteEmpty: boolean;
  setNewNoteResourceId: (resourceId: string) => void;
  syncNewNoteTitleFromEditor: (resourceId: string, isTitleEmpty: boolean) => void;
  syncNewNoteBodyFromEditor: (resourceId: string, isNoteEmpty: boolean) => void;
}

const DEFAULT_NEW_NOTE_STATE = {
  newNoteResourceId: null as string | null,
  isTitleEmpty: true,
  isNoteEmpty: true,
};

export const useNewNoteStore = create<NewNoteState>()((set) => ({
  ...DEFAULT_NEW_NOTE_STATE,

  setNewNoteResourceId: (resourceId) =>
    set({
      newNoteResourceId: resourceId,
      isTitleEmpty: true,
      isNoteEmpty: true,
    }),

  syncNewNoteTitleFromEditor: (resourceId, isTitleEmpty) =>
    set((state) => {
      if (state.newNoteResourceId !== resourceId) {
        return state;
      }
      if (!isTitleEmpty) {
        return DEFAULT_NEW_NOTE_STATE;
      }
      return { ...state, isTitleEmpty: true };
    }),

  syncNewNoteBodyFromEditor: (resourceId, isNoteEmpty) =>
    set((state) => {
      if (state.newNoteResourceId !== resourceId) {
        return state;
      }
      if (!isNoteEmpty) {
        return DEFAULT_NEW_NOTE_STATE;
      }
      return { ...state, isNoteEmpty: true };
    }),
}));

export const clearNewNoteStore = (): void => {
  useNewNoteStore.setState(DEFAULT_NEW_NOTE_STATE);
};
