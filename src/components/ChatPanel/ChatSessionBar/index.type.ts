import type { ChatSession } from '@/domains/Chat';

export interface ChatSessionBarProps {
  activeSessionId?: string | null;
  embedded?: boolean;
  open?: boolean;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}
