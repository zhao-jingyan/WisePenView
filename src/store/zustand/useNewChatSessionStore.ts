import { create } from 'zustand';

interface NewChatSessionState {
  newChatSessionId: string | null;
  newChatSessionTitle: string;
  setNewChatSession: (payload: { id: string; title: string }) => void;
  clearNewChatSessionById: (sessionId: string) => void;
}

const DEFAULT_NEW_CHAT_SESSION_STATE: Pick<
  NewChatSessionState,
  'newChatSessionId' | 'newChatSessionTitle'
> = {
  newChatSessionId: null,
  newChatSessionTitle: '',
};

export const useNewChatSessionStore = create<NewChatSessionState>()((set) => ({
  ...DEFAULT_NEW_CHAT_SESSION_STATE,

  setNewChatSession: ({ id, title }) =>
    set({
      newChatSessionId: id,
      newChatSessionTitle: title,
    }),
  clearNewChatSessionById: (sessionId) =>
    set((state) => {
      if (state.newChatSessionId !== sessionId) {
        return state;
      }
      return DEFAULT_NEW_CHAT_SESSION_STATE;
    }),
}));

export const clearNewChatSessionStore = (): void => {
  useNewChatSessionStore.setState(DEFAULT_NEW_CHAT_SESSION_STATE);
};
