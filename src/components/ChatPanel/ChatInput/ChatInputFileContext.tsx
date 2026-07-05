import { useChatService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { base64ToFile, fileToBase64, generateThumbnail } from '@/utils/file/upload';
import { toast } from '@heroui/react';
import { useMount, useUnmount } from 'ahooks';
import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContextValue';
import { selectChatInputSelectedModel, useChatInputStoreApi } from './ChatInputStore';
import type { LocalAttachmentPayload } from './index.type';

const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_RAW_BYTES_APPROX = Math.floor(MAX_IMAGE_BASE64_BYTES * 0.75);
const MAX_IMAGE_COUNT = 10;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

export function ChatInputFileProvider({ children }: { children: ReactNode }) {
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base64MapRef = useRef<Map<string, string>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const {
    addActiveAttachment,
    addPendingAttachmentUpload,
    addPendingImageMeta,
    removePendingAttachmentUpload,
    removePendingImageMeta,
    setAttachmentOpen,
    setPendingAttachmentUploadFailed,
  } = store.getState();

  useMount(() => {
    unsubscribeRef.current = store.subscribe((state, previousState) => {
      if (state.pendingImageMetas === previousState.pendingImageMetas) return;
      const validIds = new Set(state.pendingImageMetas.map((meta) => meta.id));
      for (const key of base64MapRef.current.keys()) {
        if (!validIds.has(key)) {
          base64MapRef.current.delete(key);
        }
      }
    });
  });

  useUnmount(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  });

  function removePendingImage(id: string): void {
    removePendingImageMeta(id);
    base64MapRef.current.delete(id);
  }

  async function uploadAndAddAttachment(file: File): Promise<LocalAttachmentPayload | null> {
    const id = crypto.randomUUID();
    addPendingAttachmentUpload({ id, filename: file.name, status: 'uploading' });
    try {
      const attachment = await chatService.uploadAttachment({
        file,
        saveToLibrary: false,
      });
      removePendingAttachmentUpload(id);
      addActiveAttachment(attachment);
      return attachment;
    } catch (err) {
      setPendingAttachmentUploadFailed(id);
      toast.danger(`附件上传失败: ${parseErrorMessage(err)}`);
      return null;
    }
  }

  async function addPendingVisionImage(file: File): Promise<void> {
    try {
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(`${file.name} 过大，图片大小约限制原图 3.75MB`);
        return;
      }
      const { mimeType, base64 } = await fileToBase64(file);
      const id = crypto.randomUUID();
      const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
      base64MapRef.current.set(id, base64);
      addPendingImageMeta({ id, filename: file.name, mimeType, thumbnailUrl });
    } catch (err) {
      toast.danger(`图片添加失败: ${parseErrorMessage(err)}`);
    }
  }

  async function convertPendingImagesToAttachments(): Promise<LocalAttachmentPayload[] | null> {
    const metas = store.getState().pendingImageMetas;
    if (metas.length === 0) return [];

    const attachments: LocalAttachmentPayload[] = [];
    for (const meta of metas) {
      const base64 = base64MapRef.current.get(meta.id);
      if (!base64) {
        toast.danger(`${meta.filename} 图片数据已失效，请重新添加`);
        return null;
      }
      const file = base64ToFile(base64, meta.mimeType, meta.filename);
      const attachment = await uploadAndAddAttachment(file);
      if (!attachment) return null;
      attachments.push(attachment);
      removePendingImage(meta.id);
    }

    return attachments;
  }

  async function routeFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    let acceptedImageCount = store.getState().pendingImageMetas.length;
    for (const file of files) {
      const selectedModel = selectChatInputSelectedModel(store.getState());
      const currentModelVision = selectedModel?.vision ?? false;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isImage = IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/');

      if (!isImage) {
        await uploadAndAddAttachment(file);
        continue;
      }
      if (!currentModelVision) {
        toast.warning('当前模型不支持图片，已按普通附件上传');
        await uploadAndAddAttachment(file);
        continue;
      }
      if (acceptedImageCount >= MAX_IMAGE_COUNT) {
        toast.warning(`最多 ${MAX_IMAGE_COUNT} 张图片`);
        continue;
      }
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(`${file.name} 过大，图片大小约限制原图 3.75MB`);
        continue;
      }
      acceptedImageCount += 1;
      await addPendingVisionImage(file);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      void routeFiles(e.target.files);
    }
    e.target.value = '';
  }

  function openLocalFilePicker(): void {
    fileInputRef.current?.click();
    setAttachmentOpen(false);
  }

  function clearPendingImageCache(): void {
    base64MapRef.current.clear();
  }

  const value: ChatInputFileContextValue = {
    openLocalFilePicker,
    routeFiles,
    convertPendingImagesToAttachments,
    clearPendingImageCache,
  };

  return (
    <ChatInputFileContext.Provider value={value}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </ChatInputFileContext.Provider>
  );
}
