import { create } from 'zustand';

interface ChatSessionHistoryRefreshState {
  refreshVersion: number;
  requestRefresh: () => void;
}

const DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE = {
  refreshVersion: 0,
};

export const useChatSessionHistoryRefreshStore = create<ChatSessionHistoryRefreshState>()(
  (set) => ({
    ...DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE,
    requestRefresh: () => set((state) => ({ refreshVersion: state.refreshVersion + 1 })),
  })
);

export const clearChatSessionHistoryRefreshStore = (): void => {
  useChatSessionHistoryRefreshStore.setState(DEFAULT_CHAT_SESSION_HISTORY_REFRESH_STATE);
};
