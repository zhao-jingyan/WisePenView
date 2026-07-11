import { create } from 'zustand';

interface NoteSelectionState {
  /** key 可为笔记 resourceId 或聊天 sessionId。 */
  selectedTextByResourceId: Record<string, string>;
  setSelectedText: (key: string, text: string) => void;
}

const DEFAULT_NOTE_SELECTION_STATE = {
  selectedTextByResourceId: {} as Record<string, string>,
};

export const useNoteSelectionStore = create<NoteSelectionState>()((set) => ({
  ...DEFAULT_NOTE_SELECTION_STATE,

  setSelectedText: (key, text) =>
    set((state) => ({
      selectedTextByResourceId: { ...state.selectedTextByResourceId, [key]: text },
    })),
}));

export const clearNoteSelectionStore = (): void => {
  useNoteSelectionStore.setState(DEFAULT_NOTE_SELECTION_STATE);
};
