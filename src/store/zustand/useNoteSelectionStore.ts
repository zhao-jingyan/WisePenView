import { create } from 'zustand';

type NoteSelectionState = {
  selectedTextByResourceId: Record<string, string>;
  setSelectedText: (resourceId: string, selectedText: string) => void;
  clearSelectedText: (resourceId: string) => void;
};

const DEFAULT_NOTE_SELECTION_STATE = {
  selectedTextByResourceId: {} as Record<string, string>,
};

export const useNoteSelectionStore = create<NoteSelectionState>()((set) => ({
  ...DEFAULT_NOTE_SELECTION_STATE,

  setSelectedText: (resourceId, selectedText) =>
    set((state) => {
      console.log('setSelectedText', resourceId, selectedText);
      if (state.selectedTextByResourceId[resourceId] === selectedText) {
        return state;
      }
      return {
        selectedTextByResourceId: {
          ...state.selectedTextByResourceId,
          [resourceId]: selectedText,
        },
      };
    }),

  clearSelectedText: (resourceId) =>
    set((state) => {
      if (state.selectedTextByResourceId[resourceId] == null) {
        return state;
      }
      const next = { ...state.selectedTextByResourceId };
      delete next[resourceId];
      return { selectedTextByResourceId: next };
    }),
}));

export const clearNoteSelectionStore = (): void => {
  useNoteSelectionStore.setState(DEFAULT_NOTE_SELECTION_STATE);
};
