import type { Message } from '@/components/ChatPanel/index.type';
import AiMessage from './AiMessage';
import UserMessage from './UserMessage';

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  return <AiMessage message={message} />;
}

export default MessageItem;
