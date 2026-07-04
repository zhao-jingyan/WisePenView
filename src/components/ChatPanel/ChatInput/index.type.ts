import type { Model } from '@/components/ChatPanel/index.type';
import type {
  CapabilitySkillSelection,
  CapabilityToolOption,
  ChatUploadedAttachmentContext,
} from '@/domains/Chat';

export interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => void | Promise<void>;
  sending: boolean;
  hasSelectedContext: boolean;
  selectedContextText: string;
  onClearSelectedContext: () => void;
}

export type LocalAttachmentPayload = ChatUploadedAttachmentContext;

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
  activeAttachments?: LocalAttachmentPayload[];
  selectedSkills?: CapabilitySkillSelection[];
  selectedTools?: CapabilityToolOption[];
}
