import { useChatPageStore } from '@/store';
import styles from './style.module.less';

function ContextTags() {
  const activeDocRefs = useChatPageStore((state) => state.activeDocRefs);
  const activeAttachments = useChatPageStore((state) => state.activeAttachments);
  const pendingImageMetas = useChatPageStore((state) => state.pendingImageMetas);
  const pendingAttachmentUploads = useChatPageStore((state) => state.pendingAttachmentUploads);
  const removeDocRef = useChatPageStore((state) => state.removeDocRef);
  const removeAttachment = useChatPageStore((state) => state.removeAttachment);
  const removePendingImage = useChatPageStore((state) => state.removePendingImage);
  const removePendingAttachmentUpload = useChatPageStore(
    (state) => state.removePendingAttachmentUpload
  );

  const hasAny =
    activeDocRefs.length > 0 ||
    activeAttachments.length > 0 ||
    pendingImageMetas.length > 0 ||
    pendingAttachmentUploads.length > 0;
  if (!hasAny) return null;

  return (
    <div className={styles.tags}>
      {activeDocRefs.map((ref) => (
        <span key={ref.resourceId} className={`${styles.tag} ${styles.docTag}`}>
          引用 {ref.resourceName}
          <span className={styles.tagRemove} onClick={() => removeDocRef(ref.resourceId)}>
            x
          </span>
        </span>
      ))}
      {activeAttachments.map((att) => (
        <span key={att.attachmentId} className={`${styles.tag} ${styles.attachmentTag}`}>
          附件 {att.filename}
          <span className={styles.tagRemove} onClick={() => removeAttachment(att.attachmentId)}>
            x
          </span>
        </span>
      ))}
      {pendingImageMetas.map((img) => (
        <span key={img.id} className={`${styles.tag} ${styles.imageTag}`}>
          {img.thumbnailUrl ? (
            <img src={img.thumbnailUrl} alt="" className={styles.imageThumb} />
          ) : null}
          {img.filename}
          <span className={styles.tagRemove} onClick={() => removePendingImage(img.id)}>
            x
          </span>
        </span>
      ))}
      {pendingAttachmentUploads.map((upload) => (
        <span
          key={upload.id}
          className={`${styles.tag} ${upload.status === 'uploading' ? styles.uploadingTag : styles.failedTag}`}
        >
          {upload.status === 'uploading' ? '⏳' : '⚠️'} {upload.filename}
          <span
            className={styles.tagRemove}
            onClick={() => removePendingAttachmentUpload(upload.id)}
          >
            x
          </span>
        </span>
      ))}
    </div>
  );
}

export default ContextTags;
