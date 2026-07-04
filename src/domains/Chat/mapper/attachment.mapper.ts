import type { UploadAttachmentResult } from '../service/index.type';
import type { ChatUploadedAttachmentContext } from '../session/index.type';

export const mapUploadAttachmentResultToContext = (
  result: UploadAttachmentResult
): ChatUploadedAttachmentContext => ({
  attachmentId: result.attachmentId,
  filename: result.filename,
  enabled: true,
});
