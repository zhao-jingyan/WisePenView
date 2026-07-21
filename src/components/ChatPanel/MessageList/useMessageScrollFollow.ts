import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { useContext } from 'react';
import {
  MessageScrollFollowContext,
  type MessageScrollFollowContextValue,
} from './MessageScrollFollowContext';

export function useMessageScrollFollow(): MessageScrollFollowContextValue {
  const context = useContext(MessageScrollFollowContext);

  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useMessageScrollFollow must be used within MessageScrollFollowProvider',
    });
  }

  return context;
}
