import type { CapabilitySkillSelection, CapabilityToolOption } from '@/domains/Chat';
import type {
  LocalAttachmentPayload,
  LocalAttachmentUpload,
  LocalPendingImageMeta,
  LocalResourcePayload,
} from '../index.type';

export interface AttachmentStripProps {
  selectedContextText: string;
  selectedPreview: string;
  hasSelectedContext: boolean;
  resources: LocalResourcePayload[];
  attachments: LocalAttachmentPayload[];
  images: LocalPendingImageMeta[];
  uploads: LocalAttachmentUpload[];
  skills: CapabilitySkillSelection[];
  tools: CapabilityToolOption[];
  onClearSelectedContext: () => void;
  onRemoveResource: (resourceId: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onRemoveImage: (id: string) => void;
  onRemoveUpload: (id: string) => void;
  onRemoveSkill: (skillId: string) => void;
  onRemoveTool: (tool: CapabilityToolOption) => void;
}
