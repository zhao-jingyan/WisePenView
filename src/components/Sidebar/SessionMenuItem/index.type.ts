import type { ChatSession } from '@/services/Chat';

export interface SessionMenuItemProps {
  session: ChatSession;
  onUpdated: () => Promise<void>;
  onDeleted: (sessionId: string) => void;
}
