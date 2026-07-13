import { create } from 'zustand';

import {
  DEFAULT_COMMENTS_SIDEBAR_WIDTH,
  normalizeCommentsSidebarWidth,
} from '@/components/CommentsSidebar/resize';
import { registerStore } from '@/store/lifecycle';

const DEFAULT_NOTE_ASIDE_WIDTH = DEFAULT_COMMENTS_SIDEBAR_WIDTH;

type NoteAsideMode = 'closed' | 'annotation' | 'discussion';

export const DEFAULT_NOTE_ASIDE_MODE: NoteAsideMode = 'closed';

interface NoteAsideState {
  modeByResourceId: Record<string, NoteAsideMode>;
  widthByResourceId: Record<string, number>;
  setMode: (resourceId: string, mode: NoteAsideMode) => void;
  toggleMode: (resourceId: string, mode: Exclude<NoteAsideMode, 'closed'>) => void;
  setWidth: (resourceId: string, width: number) => void;
  getWidth: (resourceId: string) => number;
}

export const useNoteAsideStore = create<NoteAsideState>((set, get) => ({
  modeByResourceId: {},
  widthByResourceId: {},
  setMode: (resourceId, mode) =>
    set((state) => {
      const currentMode = state.modeByResourceId[resourceId] ?? DEFAULT_NOTE_ASIDE_MODE;
      if (currentMode === mode) return state;
      return {
        modeByResourceId: { ...state.modeByResourceId, [resourceId]: mode },
      };
    }),
  toggleMode: (resourceId, mode) => {
    const currentMode = get().modeByResourceId[resourceId] ?? DEFAULT_NOTE_ASIDE_MODE;
    get().setMode(resourceId, currentMode === mode ? 'closed' : mode);
  },
  setWidth: (resourceId, width) => {
    const normalizedWidth = normalizeCommentsSidebarWidth(width);
    set((state) => {
      if ((state.widthByResourceId[resourceId] ?? DEFAULT_NOTE_ASIDE_WIDTH) === normalizedWidth) {
        return state;
      }
      return {
        widthByResourceId: { ...state.widthByResourceId, [resourceId]: normalizedWidth },
      };
    });
  },
  getWidth: (resourceId) => get().widthByResourceId[resourceId] ?? DEFAULT_NOTE_ASIDE_WIDTH,
}));

const resetNoteAsideStore = (): void => {
  useNoteAsideStore.setState({ modeByResourceId: {}, widthByResourceId: {} });
};

registerStore({
  id: 'note-view.aside',
  scope: 'tab',
  reset: resetNoteAsideStore,
});
