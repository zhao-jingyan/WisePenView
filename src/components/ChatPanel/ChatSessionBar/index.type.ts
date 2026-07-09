import type { ChatSession } from '@/domains/Chat';

export interface ChatSessionBarProps {
  activeSessionId?: string | null;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}
