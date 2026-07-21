import { createContext, type UIEvent } from 'react';

export interface MessageScrollFollowContextValue {
  handleViewportScroll: (event: UIEvent<HTMLDivElement>) => void;
  resumeFollowing: () => void;
  scheduleScrollToEnd: () => void;
}

export const MessageScrollFollowContext = createContext<MessageScrollFollowContextValue | null>(
  null
);
