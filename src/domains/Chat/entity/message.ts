import type { UIMessage } from 'ai';

export interface MessageAttachmentSnapshot {
  attachmentId: string;
  filename: string;
  kind: 'temporary' | 'resource';
  available: boolean;
}

export interface ChatMessageMetadata {
  createdAt?: string;
  selectedAttachments?: MessageAttachmentSnapshot[];
}

export type WisePenUIMessage = UIMessage<ChatMessageMetadata>;
