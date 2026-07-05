import type { Model } from '@/components/ChatPanel/index.type';
import type { ChatUploadedAttachmentContext, ToolOption } from '@/domains/Chat';

export type ChatInputSelectedTool = ToolOption;

export interface ChatInputSelectedSkill {
  skillId: string;
  displayName: string;
  currentVersionId?: string;
  scopeType?: 'PERSONAL' | 'GROUP';
  groupId?: string;
  groupName?: string;
  sourceAgentId?: string;
  sourceAgentLabel?: string;
  external?: boolean;
}

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
  selectedSkills?: ChatInputSelectedSkill[];
  selectedTools?: ChatInputSelectedTool[];
}
