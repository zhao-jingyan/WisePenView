import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

interface ChatPanelState {
  chatPanelCollapsed: boolean;
  chatPanelWidth: number;
  setChatPanelCollapsed: (collapsed: boolean) => void;
  setChatPanelWidth: (width: number) => void;
  toggleChatPanelCollapsed: () => void;
}

const DEFAULT_CHAT_PANEL_STATE: Pick<ChatPanelState, 'chatPanelCollapsed' | 'chatPanelWidth'> = {
  chatPanelCollapsed: true,
  chatPanelWidth: 500,
};

export const useChatPanelStore = create<ChatPanelState>()(
  persist(
    (set) => ({
      ...DEFAULT_CHAT_PANEL_STATE,
      setChatPanelCollapsed: (collapsed) =>
        set((state) => {
          if (state.chatPanelCollapsed === collapsed) {
            return state;
          }
          return { chatPanelCollapsed: collapsed };
        }),
      setChatPanelWidth: (width) =>
        set((state) => {
          if (state.chatPanelWidth === width) {
            return state;
          }
          return { chatPanelWidth: width };
        }),
      toggleChatPanelCollapsed: () =>
        set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed })),
    }),
    { name: 'chat-panel', storage: zustandSessionStorage }
  )
);

export const clearChatPanelStore = (): void => {
  useChatPanelStore.setState(DEFAULT_CHAT_PANEL_STATE);
  useChatPanelStore.persist.clearStorage();
};
