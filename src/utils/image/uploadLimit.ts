import { Upload } from 'antd';

/** 与后端 `wisepen.storage.max-small-file-size` 默认一致 */
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_UPLOAD_MAX_SIZE_LABEL = '5MB';

/**
 * 与后端图床代理 `max-small-file-size` 一致；超过则抛错，供 `uploadImage` 与业务层复用。
 */
export function assertImageProxyUploadLimit(file: File): void {
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(`图片大小不能超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`);
  }
}

/**
 * 用于 Ant Design Upload `beforeUpload`：超过图床代理上限时不进入 fileList，并提示。
 * 返回 `false` 表示不自动上传（由业务在提交时再调 ImageService）。
 * `onOversize` 请传入 `useAppMessage().error` 等，避免使用静态 message。
 */
export const createBeforeUploadImageWithinLimit = (
  onOversize: (text: string) => void
): ((file: File) => boolean | typeof Upload.LIST_IGNORE) => {
  return (file: File) => {
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      onOversize(`图片大小不能超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };
};
