import type { Message } from '@/components/ChatPanel/index.type';
import React from 'react';
import AiMessage from './AiMessage';
import UserMessage from './UserMessage';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  return <AiMessage message={message} />;
};

export default MessageItem;
