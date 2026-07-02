import type { Model } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/domains';
import {
  buildAdvancedSkillTreeGroups,
  buildCapabilityPickerSections,
  buildDefaultPersonalAgent,
  getPrimarySkillsForAgent,
  type CapabilitySkillSelection,
  type CapabilityToolOption,
  type SkillScopeTreeGroup,
} from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { base64ToFile, fileToBase64, generateThumbnail } from '@/utils/file/upload';
import { toast } from '@heroui/react';
import { useRequest, useUpdateEffect } from 'ahooks';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LocalAttachmentPayload,
  LocalAttachmentUpload,
  LocalPendingImageMeta,
  LocalResourcePayload,
  PendingImagePayload,
} from '../index.type';
import type { UseChatInputControllerOptions } from './index.type';

const DEFAULT_PERSONAL_AGENT = buildDefaultPersonalAgent();
const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_RAW_BYTES_APPROX = Math.floor(MAX_IMAGE_BASE64_BYTES * 0.75);
const MAX_IMAGE_COUNT = 10;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

function buildSkillSelection(
  skill: SkillSummary,
  options?: { sourceAgent?: ChatAgentOption | null; external?: boolean }
): CapabilitySkillSelection {
  const sourceAgent = options?.sourceAgent;
  const external =
    options?.external ??
    (Boolean(sourceAgent) &&
      (sourceAgent?.agentType === 'GROUP'
        ? sourceAgent.groupId !== skill.groupId
        : skill.scopeType === 'GROUP'));

  return {
    skillId: skill.skillId,
    displayName: skill.displayName,
    currentVersionId: skill.currentVersionId,
    scopeType: skill.scopeType,
    groupId: skill.groupId,
    groupName: skill.groupName,
    sourceAgentId: sourceAgent?.agentId,
    sourceAgentLabel: sourceAgent?.label,
    external,
  };
}

export function useChatInputController({
  onSend,
  sending,
  selectedContextText,
}: UseChatInputControllerOptions) {
  const chatService = useChatService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base64MapRef = useRef<Map<string, string>>(new Map());
  const dragCounterRef = useRef(0);

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ChatAgentOption>(DEFAULT_PERSONAL_AGENT);
  const [selectedSkills, setSelectedSkills] = useState<CapabilitySkillSelection[]>([]);
  const [selectedTools, setSelectedTools] = useState<CapabilityToolOption[]>([]);
  const [pendingImageMetas, setPendingImageMetas] = useState<LocalPendingImageMeta[]>([]);
  const [activeDocRefs, setActiveDocRefs] = useState<LocalResourcePayload[]>([]);
  const [activeAttachments, setActiveAttachments] = useState<LocalAttachmentPayload[]>([]);
  const [pendingAttachmentUploads, setPendingAttachmentUploads] = useState<LocalAttachmentUpload[]>(
    []
  );
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [capabilityOpen, setCapabilityOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [otherSkillModalOpen, setOtherSkillModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: workspace, loading: workspaceLoading } = useRequest(
    () => chatService.getWorkspace(),
    { refreshDeps: [] }
  );
  const { data: toolOptionsData } = useRequest(() => chatService.getTools(), { refreshDeps: [] });
  const { data: modelData = [], loading: modelsLoading } = useRequest(
    () => chatService.getModels(),
    { refreshDeps: [] }
  );
  const models: Model[] = modelData;
  const toolOptions: CapabilityToolOption[] = toolOptionsData ?? [];

  const agentOptions = useMemo<ChatAgentOption[]>(
    () => [
      DEFAULT_PERSONAL_AGENT,
      ...(workspace?.personalAgents ?? []),
      ...(workspace?.groupAgents ?? []),
    ],
    [workspace?.groupAgents, workspace?.personalAgents]
  );

  const primarySkills = useMemo(
    () => getPrimarySkillsForAgent(workspace?.skills ?? [], selectedAgent),
    [selectedAgent, workspace?.skills]
  );
  const advancedSkillGroups = useMemo(
    () =>
      buildAdvancedSkillTreeGroups(
        workspace?.skills ?? [],
        workspace?.groups ?? [],
        selectedAgent,
        primarySkills
      ),
    [primarySkills, selectedAgent, workspace?.groups, workspace?.skills]
  );
  const otherSkillGroups = useMemo<SkillScopeTreeGroup[]>(() => {
    const primaryIds = new Set(primarySkills.map((skill) => skill.skillId));
    return advancedSkillGroups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((skill) => !primaryIds.has(skill.skillId)),
      }))
      .filter((group) => group.skills.length > 0);
  }, [advancedSkillGroups, primarySkills]);

  const capabilitySections = buildCapabilityPickerSections({
    primarySkills,
    selectedSkills,
    selectedTools,
    toolOptions,
    advancedMode: true,
    otherSkillGroups,
  });

  const selectedModel = useMemo(() => {
    if (models.length === 0) return null;
    const explicitModel = selectedModelId
      ? models.find((model) => model.id === selectedModelId)
      : undefined;
    return explicitModel ?? models.find((model) => model.isDefault) ?? models[0];
  }, [models, selectedModelId]);
  const currentModelVision = selectedModel?.vision ?? false;
  const selectedPreviewChars = Array.from(selectedContextText);
  const selectedPreview =
    selectedPreviewChars.length <= 10
      ? selectedContextText
      : `${selectedPreviewChars.slice(0, 5).join('')}...${selectedPreviewChars.slice(-5).join('')}`;
  const sendDisabled = !value.trim() || sending || !selectedModel;

  useUpdateEffect(() => {
    const nextAgent =
      agentOptions.find((agent) => agent.agentId === selectedAgent.agentId) ??
      DEFAULT_PERSONAL_AGENT;
    if (nextAgent.agentId !== selectedAgent.agentId) {
      setSelectedAgent(nextAgent);
    }
  }, [agentOptions, selectedAgent.agentId]);

  useUpdateEffect(() => {
    setSelectedSkills([]);
    setSelectedTools([]);
  }, [selectedAgent.agentId]);

  useUpdateEffect(() => {
    const validIds = new Set(pendingImageMetas.map((meta) => meta.id));
    for (const key of base64MapRef.current.keys()) {
      if (!validIds.has(key)) {
        base64MapRef.current.delete(key);
      }
    }
  }, [pendingImageMetas]);

  function removeAttachment(attachmentId: string): void {
    setActiveAttachments((prev) =>
      prev.filter((attachment) => attachment.attachmentId !== attachmentId)
    );
  }

  function addDocRefs(resources: LocalResourcePayload[]): void {
    setActiveDocRefs((prev) => {
      const existingIds = new Set(prev.map((resource) => resource.resourceId));
      const additions = resources.filter((resource) => !existingIds.has(resource.resourceId));
      return [...prev, ...additions];
    });
  }

  function removeDocRef(resourceId: string): void {
    setActiveDocRefs((prev) => prev.filter((resource) => resource.resourceId !== resourceId));
  }

  function removePendingImage(id: string): void {
    setPendingImageMetas((prev) => prev.filter((meta) => meta.id !== id));
    base64MapRef.current.delete(id);
  }

  function removeUpload(id: string): void {
    setPendingAttachmentUploads((prev) => prev.filter((upload) => upload.id !== id));
  }

  function toggleSkill(skillId: string): void {
    const skill = primarySkills.find((item) => item.skillId === skillId);
    if (!skill) return;
    setSelectedSkills((prev) => {
      const exists = prev.some((item) => item.skillId === skillId);
      if (exists) return prev.filter((item) => item.skillId !== skillId);
      return [...prev, buildSkillSelection(skill, { sourceAgent: selectedAgent })];
    });
  }

  function removeSkill(skillId: string): void {
    setSelectedSkills((prev) => prev.filter((item) => item.skillId !== skillId));
  }

  function toggleTool(toolId: string): void {
    const tool = toolOptions.find((item) => item.toolId === toolId);
    if (!tool) return;
    setSelectedTools((prev) => {
      const exists = prev.some((item) => item.toolId === toolId);
      return exists ? prev.filter((item) => item.toolId !== toolId) : [...prev, tool];
    });
  }

  function removeTool(tool: CapabilityToolOption): void {
    toggleTool(tool.toolId);
  }

  function handleOtherSkillConfirm(
    selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>
  ): void {
    const selectedIds = new Set(selected.map((item) => item.skill.skillId));
    setSelectedSkills((prev) => {
      const kept = prev.filter((item) => !item.external || selectedIds.has(item.skillId));
      const existingIds = new Set(kept.map((item) => item.skillId));
      const additions = selected
        .filter(({ skill }) => !existingIds.has(skill.skillId))
        .map(({ skill, sourceAgent }) =>
          buildSkillSelection(skill, { sourceAgent, external: true })
        );
      return [...kept, ...additions];
    });
  }

  async function uploadAndAddAttachment(file: File): Promise<void> {
    const id = crypto.randomUUID();
    setPendingAttachmentUploads((prev) => [
      ...prev,
      { id, filename: file.name, status: 'uploading' },
    ]);
    try {
      const result = await chatService.uploadAttachment({
        file,
        saveToLibrary: false,
      });
      setPendingAttachmentUploads((prev) => prev.filter((item) => item.id !== id));
      setActiveAttachments((prev) => {
        if (prev.some((item) => item.attachmentId === result.attachmentId)) return prev;
        return [
          ...prev,
          {
            attachmentId: result.attachmentId,
            filename: result.filename ?? file.name,
            enabled: true,
          },
        ];
      });
    } catch (err) {
      setPendingAttachmentUploads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'failed' } : item))
      );
      toast.danger(`附件上传失败: ${parseErrorMessage(err)}`);
    }
  }

  async function addPendingVisionImage(file: File): Promise<void> {
    try {
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(`${file.name} 过大，图片直传约限制原图 3.75MB`);
        return;
      }
      const { mimeType, base64 } = await fileToBase64(file);
      const id = crypto.randomUUID();
      const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
      base64MapRef.current.set(id, base64);
      setPendingImageMetas((prev) => [
        ...prev,
        { id, filename: file.name, mimeType, thumbnailUrl },
      ]);
    } catch (err) {
      toast.danger(`图片添加失败: ${parseErrorMessage(err)}`);
    }
  }

  async function convertPendingImagesToAttachments(): Promise<void> {
    if (pendingImageMetas.length === 0) return;
    for (const meta of pendingImageMetas) {
      const base64 = base64MapRef.current.get(meta.id);
      if (!base64) continue;
      const file = base64ToFile(base64, meta.mimeType, meta.filename);
      await uploadAndAddAttachment(file);
      removePendingImage(meta.id);
    }
  }

  async function routeFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    let acceptedImageCount = pendingImageMetas.length;
    for (const file of files) {
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
        toast.warning(`${file.name} 过大，图片直传约限制原图 3.75MB`);
        continue;
      }
      acceptedImageCount += 1;
      await addPendingVisionImage(file);
    }
  }

  function handleModelChange(model: Model): void {
    const wasVision = currentModelVision;
    setSelectedModelId(model.id);
    setModelOpen(false);
    if (wasVision && !model.vision) {
      void convertPendingImagesToAttachments();
    }
  }

  async function handleSend(): Promise<void> {
    const text = value.trim();
    if (!text || sending || !selectedModel) return;
    if (pendingAttachmentUploads.some((upload) => upload.status === 'uploading')) {
      toast.warning('附件仍在上传中，请稍后再发送');
      return;
    }

    const pendingImages: PendingImagePayload[] = currentModelVision
      ? pendingImageMetas
          .map((meta) => {
            const base64 = base64MapRef.current.get(meta.id);
            if (!base64) return null;
            return { mimeType: meta.mimeType, base64, filename: meta.filename };
          })
          .filter((item): item is PendingImagePayload => item != null)
      : [];

    try {
      await onSend(text, {
        model: selectedModel,
        activeDocRefs,
        activeAttachments,
        pendingImages: pendingImages.length > 0 ? pendingImages : undefined,
      });
      setValue('');
      setSelectedSkills([]);
      setSelectedTools([]);
      setActiveDocRefs([]);
      setActiveAttachments([]);
      setPendingImageMetas([]);
      setPendingAttachmentUploads([]);
      base64MapRef.current.clear();
    } catch (err) {
      toast.danger(`发送失败: ${parseErrorMessage(err)}`);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void routeFiles(e.dataTransfer.files);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>): void {
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
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      void routeFiles(e.target.files);
    }
    e.target.value = '';
  }

  function openUploadPicker(): void {
    fileInputRef.current?.click();
    setAttachmentOpen(false);
  }

  function openDocumentPicker(): void {
    setAttachmentOpen(false);
    setDocumentPickerOpen(true);
  }

  function openOtherSkillModal(): void {
    setCapabilityOpen(false);
    setOtherSkillModalOpen(true);
  }

  return {
    activeDocRefs,
    activeAttachments,
    addDocRefs,
    agentOptions,
    attachmentOpen,
    capabilityOpen,
    capabilitySections,
    documentPickerOpen,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    handleKeyDown,
    handleModelChange,
    handleOtherSkillConfirm,
    handlePaste,
    handleSend,
    isDragOver,
    modelOpen,
    models,
    modelsLoading,
    openDocumentPicker,
    openOtherSkillModal,
    openUploadPicker,
    otherSkillGroups,
    otherSkillModalOpen,
    pendingAttachmentUploads,
    pendingImageMetas,
    removeAttachment,
    removeDocRef,
    removePendingImage,
    removeSkill,
    removeTool,
    removeUpload,
    selectedAgent,
    selectedModel,
    selectedPreview,
    selectedSkills,
    selectedTools,
    sendDisabled,
    setAttachmentOpen,
    setCapabilityOpen,
    setDocumentPickerOpen,
    setIsComposing,
    setModelOpen,
    setOtherSkillModalOpen,
    setSelectedAgent,
    setValue,
    toggleSkill,
    toggleTool,
    value,
    workspaceLoading,
  };
}
