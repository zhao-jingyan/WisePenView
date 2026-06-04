import type { SkillSummary } from '@/domains';
import { useChatService } from '@/domains';
import type { ChatAgentOption, TemporarySkillSelection } from '@/store';
import { useChatCapabilityStore, useChatPageStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest, useUpdateEffect } from 'ahooks';
import { Input } from 'antd';
import { X } from 'lucide-react';
import {
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import ActionToolbar from './ActionToolbar';
import CapabilityPicker from './CapabilityPicker';
import ContentPicker from './ContentPicker';
import ContextTags from './ContextTags';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import OtherSkillModal from './OtherSkillModal';
import { type CapabilityToolOption } from './capability';
import type { ChatInputProps, PendingImagePayload } from './index.type';
import styles from './style.module.less';
import { base64ToFile, fileToBase64, generateThumbnail } from './uploadUtils';

const { TextArea } = Input;

const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

function ChatInput({
  onSend,
  sending,
  currentModelId,
  onModelChange,
  hasSelectedContext,
  selectedContextText,
  onClearSelectedContext,
  selectedAgent,
  primarySkills,
  advancedMode,
  advancedSkillGroups,
  currentModelVision,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [capabilityOpen, setCapabilityOpen] = useState(false);
  const [contentPickOpen, setContentPickOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [otherSkillModalOpen, setOtherSkillModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const suppressCapabilityCloseRef = useRef(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base64MapRef = useRef<Map<string, string>>(new Map());
  const selectedSkills = useChatCapabilityStore((state) => state.selectedSkills);
  const selectedTools = useChatCapabilityStore((state) => state.selectedTools);
  const toggleSkill = useChatCapabilityStore((state) => state.toggleSkill);
  const removeSkill = useChatCapabilityStore((state) => state.removeSkill);
  const toggleTool = useChatCapabilityStore((state) => state.toggleTool);
  const clearCapabilities = useChatCapabilityStore((state) => state.clearCapabilities);
  const chatService = useChatService();

  const pendingImageMetas = useChatPageStore((state) => state.pendingImageMetas);
  const addPendingImage = useChatPageStore((state) => state.addPendingImage);
  const removePendingImage = useChatPageStore((state) => state.removePendingImage);
  const addAttachment = useChatPageStore((state) => state.addAttachment);
  const addPendingAttachmentUpload = useChatPageStore((state) => state.addPendingAttachmentUpload);
  const updatePendingAttachmentUpload = useChatPageStore(
    (state) => state.updatePendingAttachmentUpload
  );
  const removePendingAttachmentUpload = useChatPageStore(
    (state) => state.removePendingAttachmentUpload
  );

  // Cleanup base64MapRef when pendingImageMetas shrink
  useUpdateEffect(() => {
    const validIds = new Set(pendingImageMetas.map((m) => m.id));
    for (const key of base64MapRef.current.keys()) {
      if (!validIds.has(key)) {
        base64MapRef.current.delete(key);
      }
    }
  }, [pendingImageMetas]);

  const selectedPreviewChars = Array.from(selectedContextText);
  const selectedPreview =
    selectedPreviewChars.length <= 10
      ? selectedContextText
      : `${selectedPreviewChars.slice(0, 5).join('')}...${selectedPreviewChars.slice(-5).join('')}`;

  const { data: toolOptionsData } = useRequest(() => chatService.getTools(), { refreshDeps: [] });
  const toolOptions = useMemo<CapabilityToolOption[]>(
    () => toolOptionsData ?? [],
    [toolOptionsData]
  );

  const otherSkillGroups = useMemo(() => {
    const primaryIds = new Set(primarySkills.map((s) => s.skillId));
    return advancedSkillGroups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((s) => !primaryIds.has(s.skillId)),
      }))
      .filter((group) => group.skills.length > 0);
  }, [advancedSkillGroups, primarySkills]);

  const togglePrimarySkill = useCallback(
    (skill: SkillSummary) => {
      toggleSkill(skill, { sourceAgent: selectedAgent });
    },
    [selectedAgent, toggleSkill]
  );

  const handleOtherSkillConfirm = useCallback(
    (selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>) => {
      const selectedIds = new Set(selected.map((s) => s.skill.skillId));
      const toRemove = selectedSkills.filter((s) => s.external && !selectedIds.has(s.skillId));
      toRemove.forEach((s) => removeSkill(s.skillId));
      const existingIds = new Set(selectedSkills.map((s) => s.skillId));
      selected.forEach(({ skill, sourceAgent }) => {
        if (!existingIds.has(skill.skillId)) {
          toggleSkill(skill, { sourceAgent });
        }
      });
    },
    [selectedSkills, removeSkill, toggleSkill]
  );

  const addPendingVisionImage = useCallback(
    async (file: File) => {
      const pendingCount = useChatPageStore.getState().pendingImageMetas.length;
      if (pendingCount >= MAX_IMAGE_COUNT) {
        toast.warning(`最多添加 ${MAX_IMAGE_COUNT} 张图片`);
        return;
      }
      try {
        const { mimeType, base64 } = await fileToBase64(file);
        if (base64.length > MAX_IMAGE_BASE64_BYTES) {
          toast.warning(`${file.name} 超过 5MB 限制`);
          return;
        }
        const id = crypto.randomUUID();
        const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
        addPendingImage({ id, mimeType, filename: file.name, thumbnailUrl });
        base64MapRef.current.set(id, base64);
        // added
      } catch (err) {
        toast.danger(`图片添加失败：${parseErrorMessage(err)}`);
      }
    },
    [addPendingImage]
  );

  const uploadAndAddAttachment = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      addPendingAttachmentUpload({ id, filename: file.name, status: 'uploading' });
      try {
        const result = await chatService.uploadAttachment({ file });
        removePendingAttachmentUpload(id);
        addAttachment({
          attachmentId: result.attachmentId,
          filename: result.filename ?? file.name,
          enabled: true,
        });
        // upload success
      } catch (err) {
        updatePendingAttachmentUpload(id, {
          status: 'failed',
          errorMessage: parseErrorMessage(err),
        });
        console.error('[Upload] failed:', file.name, err);
      }
    },
    [
      chatService,
      addPendingAttachmentUpload,
      removePendingAttachmentUpload,
      addAttachment,
      updatePendingAttachmentUpload,
    ]
  );

  const routeFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const isImage = IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/');
        if (isImage && currentModelVision) {
          await addPendingVisionImage(file);
        } else {
          void uploadAndAddAttachment(file);
        }
      }
    },
    [currentModelVision, addPendingVisionImage, uploadAndAddAttachment]
  );

  const convertPendingImagesToAttachments = useCallback(async () => {
    const metas = useChatPageStore.getState().pendingImageMetas;
    if (metas.length === 0) return;
    for (const meta of metas) {
      const base64 = base64MapRef.current.get(meta.id);
      if (!base64) continue;
      const file = base64ToFile(base64, meta.mimeType, meta.filename);
      removePendingImage(meta.id);
      base64MapRef.current.delete(meta.id);
      void uploadAndAddAttachment(file);
    }
  }, [removePendingImage, uploadAndAddAttachment]);

  const handleModelChange = useCallback(
    (model: Parameters<typeof onModelChange>[0]) => {
      const wasVision = currentModelVision;
      onModelChange(model);
      // After model switch, if vision -> non-vision, convert pending images
      if (wasVision) {
        void convertPendingImagesToAttachments();
      }
    },
    [currentModelVision, onModelChange, convertPendingImagesToAttachments]
  );

  const handleSend = async () => {
    if (!value.trim() || sending || !currentModelId) return;
    const uploading = useChatPageStore
      .getState()
      .pendingAttachmentUploads.some((u) => u.status === 'uploading');
    if (uploading) {
      toast.warning('附件仍在上传中，请稍后');
      return;
    }
    let pendingImages: PendingImagePayload[] | undefined;
    if (currentModelVision && pendingImageMetas.length > 0) {
      pendingImages = [];
      for (const meta of pendingImageMetas) {
        const base64 = base64MapRef.current.get(meta.id);
        if (base64) {
          pendingImages.push({ mimeType: meta.mimeType, base64, filename: meta.filename });
        }
      }
    }
    await onSend(
      value.trim(),
      pendingImages && pendingImages.length > 0 ? { pendingImages } : undefined
    );
    setValue('');
    clearCapabilities();
    // Clear sent images from store and ref
    const sentIds = new Set(pendingImageMetas.map((m) => m.id));
    for (const id of sentIds) {
      removePendingImage(id);
      base64MapRef.current.delete(id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (nextValue: string) => {
    setValue(nextValue);
  };

  const handleCapabilityOpenChange = useCallback((open: boolean) => {
    if (!open && suppressCapabilityCloseRef.current) {
      suppressCapabilityCloseRef.current = false;
      return;
    }
    if (open) setContentPickOpen(false);
    setCapabilityOpen(open);
  }, []);

  const handleContentPickOpenChange = useCallback((open: boolean) => {
    if (open) setCapabilityOpen(false);
    setContentPickOpen(open);
  }, []);

  // Drag handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        void routeFiles(e.dataTransfer.files);
      }
    },
    [routeFiles]
  );

  // Paste handler
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void routeFiles([file]);
          return;
        }
      }
    },
    [routeFiles]
  );

  useUpdateEffect(() => {
    clearCapabilities();
  }, [advancedMode, clearCapabilities, selectedAgent?.agentId]);

  const normalizedSelectedSkills = useMemo<TemporarySkillSelection[]>(
    () => selectedSkills,
    [selectedSkills]
  );

  const capabilityDropdownContent = (
    <CapabilityPicker
      open
      advancedMode={advancedMode}
      primarySkills={primarySkills}
      selectedSkills={normalizedSelectedSkills}
      selectedTools={selectedTools}
      toolOptions={toolOptions}
      onToggleSkill={togglePrimarySkill}
      onToggleTool={toggleTool}
      onRemoveExternalSkill={removeSkill}
      onOpenOtherSkillModal={() => {
        setCapabilityOpen(false);
        setOtherSkillModalOpen(true);
      }}
      currentAgent={selectedAgent}
      otherSkillGroups={otherSkillGroups}
      onMenuInteract={() => {
        suppressCapabilityCloseRef.current = true;
      }}
    />
  );

  const contentPickDropdownContent = (
    <ContentPicker
      open
      onClose={() => setContentPickOpen(false)}
      onSelectUpload={() => {
        setContentPickOpen(false);
        fileInputRef.current?.click();
      }}
      onSelectLibrary={() => {
        setContentPickOpen(false);
        setDocPickerOpen(true);
      }}
    />
  );

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.inputCard} ref={inputCardRef}>
        <DropOverlay visible={isDragOver} />

        {hasSelectedContext ? (
          <div className={styles.selectedHint}>
            <button
              type="button"
              className={styles.clearSelectedHintBtn}
              onClick={onClearSelectedContext}
              aria-label="清除已选内容"
            >
              <X size={12} />
            </button>
            <span className={styles.selectedHintText} title={selectedContextText}>
              选中内容：{'\u201C'}
              {selectedPreview}
              {'\u201D'}
            </span>
          </div>
        ) : null}

        <ContextTags />

        <div className={styles.textareaWrap}>
          <TextArea
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="输入消息..."
            autoSize={{ minRows: 1, maxRows: 8 }}
            className={styles.textarea}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onPaste={handlePaste}
          />
        </div>

        <div className={styles.actionArea}>
          <ActionToolbar
            modelValue={currentModelId}
            onModelChange={handleModelChange}
            onSend={() => void handleSend()}
            disabledSend={!value.trim() || sending || !currentModelId}
            capabilityCount={selectedSkills.length + selectedTools.length}
            capabilityOpen={capabilityOpen}
            onCapabilityOpenChange={handleCapabilityOpenChange}
            capabilityDropdownContent={capabilityDropdownContent}
            contentPickOpen={contentPickOpen}
            onContentPickOpenChange={handleContentPickOpenChange}
            contentPickDropdownContent={contentPickDropdownContent}
            getPopupContainer={() => inputCardRef.current || document.body}
          />
        </div>
      </div>

      <OtherSkillModal
        open={otherSkillModalOpen}
        groups={otherSkillGroups}
        currentAgent={selectedAgent}
        selectedSkills={normalizedSelectedSkills}
        onClose={() => setOtherSkillModalOpen(false)}
        onConfirm={handleOtherSkillConfirm}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void routeFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <DocumentPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} />

      <div className={styles.footerTip}>AI 内容仅供参考，请仔细甄别</div>
    </div>
  );
}

export default ChatInput;
