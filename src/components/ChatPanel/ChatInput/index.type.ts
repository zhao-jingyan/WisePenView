import type { Model } from '@/components/ChatPanel/index.type';

export interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => void | Promise<void>;
  sending: boolean;
  hasSelectedContext: boolean;
  selectedContextText: string;
  onClearSelectedContext: () => void;
}

export interface PendingImagePayload {
  mimeType: string;
  base64: string;
  filename?: string;
}

export interface LocalAttachmentPayload {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface LocalResourcePayload {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface LocalPendingImageMeta {
  id: string;
  mimeType: string;
  filename: string;
  thumbnailUrl: string;
}

export interface LocalAttachmentUpload {
  id: string;
  filename: string;
  status: 'uploading' | 'failed';
}

export interface SendOptions {
  model?: Model;
  activeDocRefs?: LocalResourcePayload[];
  pendingImages?: PendingImagePayload[];
  activeAttachments?: LocalAttachmentPayload[];
}
