import EntryIcon from '@/components/Icons/EntryIcon';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import { Image, TextQuote, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../ChatInputStore';
import styles from '../style.module.less';
import type { AttachmentStripProps } from './index.type';

function AttachmentStrip({
  selectedContextText,
  selectedPreview,
  hasSelectedContext,
  onClearSelectedContext,
}: AttachmentStripProps) {
  const store = useChatInputStoreApi();
  const { resources, attachments, images, uploads } = useChatInputStore(
    useShallow((state) => ({
      resources: state.activeDocRefs,
      attachments: state.activeAttachments,
      images: state.pendingImageMetas,
      uploads: state.pendingAttachmentUploads,
    }))
  );
  const {
    removeActiveAttachment,
    removeDocRef,
    removePendingAttachmentUpload,
    removePendingImageMeta,
  } = store.getState();

  const hasAny =
    hasSelectedContext ||
    resources.length > 0 ||
    attachments.length > 0 ||
    images.length > 0 ||
    uploads.length > 0;

  if (!hasAny) return null;

  return (
    <AttachmentGroup className={styles.attachmentArea} aria-label="输入上下文">
      {hasSelectedContext ? (
        <Attachment size="xs" className={styles.chatAttachment}>
          <AttachmentMedia>
            <TextQuote size={13} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>选中内容</AttachmentTitle>
            <AttachmentDescription title={selectedContextText}>
              {selectedPreview}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="清除已选内容" onPress={onClearSelectedContext}>
              <X size={12} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : null}

      {resources.map((resource) => (
        <Attachment key={resource.resourceId} size="xs" className={styles.chatAttachment}>
          <AttachmentMedia>
            <EntryIcon
              entryType="resource"
              resourceName={resource.resourceName}
              resourceType={resource.resourceType}
              size={14}
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={resource.resourceName}>{resource.resourceName}</AttachmentTitle>
            <AttachmentDescription>文档引用</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`移除文档 ${resource.resourceName}`}
              onPress={() => removeDocRef(resource.resourceId)}
            >
              <X size={12} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}

      {attachments.map((attachment) => (
        <Attachment key={attachment.attachmentId} size="xs" className={styles.chatAttachment}>
          <AttachmentMedia>
            <EntryIcon entryType="resource" resourceName={attachment.filename} size={14} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={attachment.filename}>{attachment.filename}</AttachmentTitle>
            <AttachmentDescription>附件</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`移除附件 ${attachment.filename}`}
              onPress={() => removeActiveAttachment(attachment.attachmentId)}
            >
              <X size={12} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}

      {images.map((imageMeta) => (
        <Attachment key={imageMeta.id} size="xs" state="idle" className={styles.chatAttachment}>
          <AttachmentMedia variant={imageMeta.thumbnailUrl ? 'image' : 'icon'}>
            {imageMeta.thumbnailUrl ? (
              <img src={imageMeta.thumbnailUrl} alt="" />
            ) : (
              <Image size={13} />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={imageMeta.filename}>{imageMeta.filename}</AttachmentTitle>
            <AttachmentDescription>图片待发送</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`移除图片 ${imageMeta.filename}`}
              onPress={() => removePendingImageMeta(imageMeta.id)}
            >
              <X size={12} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}

      {uploads.map((upload) => (
        <Attachment
          key={upload.id}
          size="xs"
          state={upload.status === 'uploading' ? 'uploading' : 'error'}
          className={styles.chatAttachment}
        >
          <AttachmentMedia>
            <EntryIcon entryType="resource" resourceName={upload.filename} size={14} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={upload.filename}>{upload.filename}</AttachmentTitle>
            <AttachmentDescription>
              {upload.status === 'uploading' ? '上传中' : '上传失败'}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`移除上传项 ${upload.filename}`}
              onPress={() => removePendingAttachmentUpload(upload.id)}
            >
              <X size={12} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}

export default AttachmentStrip;
