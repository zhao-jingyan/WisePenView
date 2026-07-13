import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';

const DEFAULT_AI_DIFF_DISPLAY_MODE = AI_DIFF_DISPLAY_MODE.COMPARE;

type AiDiffDisplayState = {
  displayMode: AiDiffDisplayMode;
  setDisplayMode: (mode: AiDiffDisplayMode) => void;
};

export const useAiDiffDisplayStore = create<AiDiffDisplayState>()(
  persist(
    (set) => ({
      displayMode: DEFAULT_AI_DIFF_DISPLAY_MODE,
      setDisplayMode: (mode) => set({ displayMode: mode }),
    }),
    { name: 'ai-diff-display', storage: createStoreJSONStorage('tab') }
  )
);

const resetAiDiffDisplayStore = (): void => {
  useAiDiffDisplayStore.setState({ displayMode: DEFAULT_AI_DIFF_DISPLAY_MODE });
};

registerStore({
  id: 'note-view.ai-diff-display',
  scope: 'tab',
  reset: resetAiDiffDisplayStore,
});
