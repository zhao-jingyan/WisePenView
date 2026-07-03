import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { useContext } from 'react';
import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContextValue';

export function useChatInputFiles(): ChatInputFileContextValue {
  const context = useContext(ChatInputFileContext);
  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, {
      reason: 'useChatInputFiles must be used within ChatInputFileProvider',
    });
  }
  return context;
}
