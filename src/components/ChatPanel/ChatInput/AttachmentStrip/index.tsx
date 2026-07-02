import { Chip } from '@heroui/react';
import clsx from 'clsx';
import { Image, LoaderCircle, Paperclip, Sparkles, TriangleAlert, Wrench, X } from 'lucide-react';
import type { AttachmentStripProps } from './index.type';
import styles from '../style.module.less';

function AttachmentStrip({
  selectedContextText,
  selectedPreview,
  hasSelectedContext,
  resources,
  attachments,
  images,
  uploads,
  skills,
  tools,
  onClearSelectedContext,
  onRemoveResource,
  onRemoveAttachment,
  onRemoveImage,
  onRemoveUpload,
  onRemoveSkill,
  onRemoveTool,
}: AttachmentStripProps) {
  const hasAny =
    hasSelectedContext ||
    resources.length > 0 ||
    attachments.length > 0 ||
    images.length > 0 ||
    uploads.length > 0 ||
    skills.length > 0 ||
    tools.length > 0;

  if (!hasAny) return null;

  return (
    <div className={styles.attachmentArea} aria-label="输入上下文">
      {hasSelectedContext ? (
        <Chip size="sm" variant="soft" className={styles.contextChip}>
          <Chip.Label title={selectedContextText}>选中内容：{selectedPreview}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={onClearSelectedContext}
            aria-label="清除已选内容"
          >
            <X size={12} />
          </button>
        </Chip>
      ) : null}

      {resources.map((resource) => (
        <Chip key={resource.resourceId} size="sm" variant="soft" className={styles.fileChip}>
          <Paperclip size={13} />
          <Chip.Label>{resource.resourceName}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveResource(resource.resourceId)}
            aria-label={`移除文档 ${resource.resourceName}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}

      {attachments.map((attachment) => (
        <Chip
          key={attachment.attachmentId}
          size="sm"
          variant="soft"
          className={styles.fileChip}
        >
          <Paperclip size={13} />
          <Chip.Label>{attachment.filename}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveAttachment(attachment.attachmentId)}
            aria-label={`移除附件 ${attachment.filename}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}

      {images.map((imageMeta) => (
        <Chip key={imageMeta.id} size="sm" variant="soft" className={styles.imageChip}>
          {imageMeta.thumbnailUrl ? (
            <img src={imageMeta.thumbnailUrl} alt="" className={styles.imageThumb} />
          ) : (
            <Image size={13} />
          )}
          <Chip.Label>{imageMeta.filename}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveImage(imageMeta.id)}
            aria-label={`移除图片 ${imageMeta.filename}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}

      {uploads.map((upload) => (
        <Chip
          key={upload.id}
          size="sm"
          variant="soft"
          className={clsx(styles.uploadChip, upload.status === 'failed' && styles.failedUploadChip)}
        >
          {upload.status === 'uploading' ? (
            <LoaderCircle size={13} className={styles.spinIcon} />
          ) : (
            <TriangleAlert size={13} />
          )}
          <Chip.Label>{upload.filename}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveUpload(upload.id)}
            aria-label={`移除上传项 ${upload.filename}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}

      {skills.map((skill) => (
        <Chip key={skill.skillId} size="sm" variant="soft" className={styles.skillChip}>
          <Sparkles size={13} />
          <Chip.Label>{skill.displayName}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveSkill(skill.skillId)}
            aria-label={`移除 Skill ${skill.displayName}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}

      {tools.map((tool) => (
        <Chip key={tool.toolId} size="sm" variant="soft" className={styles.toolChip}>
          <Wrench size={13} />
          <Chip.Label>{tool.label}</Chip.Label>
          <button
            type="button"
            className={styles.chipRemoveButton}
            onClick={() => onRemoveTool(tool)}
            aria-label={`移除工具 ${tool.label}`}
          >
            <X size={12} />
          </button>
        </Chip>
      ))}
    </div>
  );
}

export default AttachmentStrip;
