import type { Model } from '@/components/ChatPanel/index.type';
import type { WisePenUIMessage } from '@/domains/Chat';
import AiMessage from './AiMessage';
import UserMessage from './UserMessage';

interface MessageItemProps {
  message: WisePenUIMessage;
  model: Model | null;
  streaming: boolean;
}

function MessageItem({ message, model, streaming }: MessageItemProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  return <AiMessage message={message} model={model} streaming={streaming} />;
}

export default MessageItem;
