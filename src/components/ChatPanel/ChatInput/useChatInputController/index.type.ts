import type { ChatInputProps } from '../index.type';

export interface UseChatInputControllerOptions {
  onSend: ChatInputProps['onSend'];
  sending: boolean;
  selectedContextText: string;
}
