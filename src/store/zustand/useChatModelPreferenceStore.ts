import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

type ChatModelPreferenceState = {
  lastSelectedModelId: string | null;
  setLastSelectedModelId: (modelId: string) => void;
};

const DEFAULT_CHAT_MODEL_PREFERENCE_STATE = {
  lastSelectedModelId: null as string | null,
};

export const useChatModelPreferenceStore = create<ChatModelPreferenceState>()(
  persist(
    (set) => ({
      ...DEFAULT_CHAT_MODEL_PREFERENCE_STATE,
      setLastSelectedModelId: (modelId) => set({ lastSelectedModelId: modelId }),
    }),
    { name: 'chat-model-preference', storage: zustandSessionStorage }
  )
);

export const clearChatModelPreferenceStore = (): void => {
  useChatModelPreferenceStore.setState(DEFAULT_CHAT_MODEL_PREFERENCE_STATE);
  useChatModelPreferenceStore.persist.clearStorage();
};
