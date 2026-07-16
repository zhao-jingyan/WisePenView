import type { WisePenUIMessage } from '@/domains/Chat';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';

export const HISTORY_PAGE_SIZE = 100;

export const hasRenderableMessageContent = (messages: readonly WisePenUIMessage[]): boolean =>
  messages.some((message) =>
    message.parts.some((part) => {
      if (isTextUIPart(part) || isReasoningUIPart(part)) return part.text.trim().length > 0;
      return isToolUIPart(part);
    })
  );

export const isSessionInvalidMessage = (message: string): boolean => {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage) return false;
  return (
    normalizedMessage.includes('会话不存在') ||
    normalizedMessage.includes('目标会话不存在') ||
    normalizedMessage.includes('session 不存在') ||
    (normalizedMessage.includes('session') &&
      (normalizedMessage.includes('not exist') ||
        normalizedMessage.includes('not found') ||
        normalizedMessage.includes('invalid')))
  );
};
