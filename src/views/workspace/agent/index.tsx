import { DriveCreate } from '@/components/Drive/Modals';
import { ResultState, Spin } from '@/components/Feedback';
import { UnsavedChangesDialog } from '@/components/Overlay';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import VersionDropdown from '@/components/VersionDropdown';
import { useAgentService, useChatService, useSkillService } from '@/domains';
import type { AgentAsset, AgentDetail, AgentSpec } from '@/domains/Agent';
import type { ChatAgentOption } from '@/domains/Chat';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button, toast } from '@heroui/react';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Save, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import AgentSectionNav from './_components/AgentSectionNav';
import AssetsSection from './_components/AssetsSection';
import BasicInfoSection from './_components/BasicInfoSection';
import CapabilitiesSection from './_components/CapabilitiesSection';
import MemorySection from './_components/MemorySection';
import ModelSection from './_components/ModelSection';
import SystemPromptSection, { type PromptMode } from './_components/SystemPromptSection';
import { useAgentWorkspaceController } from './_hooks/useAgentWorkspaceController';
import { loadAgentEditorData } from './_services/agentEditorDataService';
import styles from './style.module.less';
import { buildGuidedPrompt, DEFAULT_GUIDED_PROMPT_FIELDS, parseGuidedPrompt } from './systemPrompt';

interface Props {
  resourceId?: string;
}
const anchors = [
  ['agent-info', '基础信息'],
  ['prompt', 'System Prompt'],
  ['model', '模型配置'],
  ['capabilities', '工具与 Skill'],
  ['memory', '记忆策略'],
  ['assets', '附件资源'],
] as const;
const AGENT_SCROLL_CONTAINER_ID = 'agent-editor-scroll';
const saveText = (phase: string) =>
  phase === 'dirty'
    ? '有未保存修改'
    : phase === 'saving'
      ? '保存中...'
      : phase === 'failed'
        ? '保存失败'
        : '已经保存到云端';

export default function AgentView({ resourceId }: Props) {
  const agentService = useAgentService();
  const chatService = useChatService();
  const skillService = useSkillService();
  const navigate = useNavigate();
  const openInWorkspace = useOpenInWorkspace();
  const controller = useAgentWorkspaceController();
  const [createOpen, setCreateOpen] = useState(!resourceId);
  const [promptMode, setPromptMode] = useState<PromptMode>('guided');
  const [promptResetOpen, setPromptResetOpen] = useState(false);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const [assetOverride, setAssetOverride] = useState<AgentAsset[] | null>(null);
  const [agentOverride, setAgentOverride] = useState<AgentDetail | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const load = useRequest(
    async () => {
      if (!resourceId) return null;
      return loadAgentEditorData({ resourceId, agentService, chatService, skillService });
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
      onSuccess: (data) => {
        if (!data) return;
        setAssetOverride(null);
        setAgentOverride(null);
        setViewingVersion(null);
        controller.initialize(data.agent, { savedDraft: data.savedDraft });
        setPromptMode(
          parseGuidedPrompt(data.agent.spec.systemPrompt).compatible ? 'guided' : 'free'
        );
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const { loading: versionLoading, run: runSwitchVersion } = useRequest(
    async (version: number) => {
      if (!resourceId) return null;
      return agentService.getAgentDetail(resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (!data) return;
        const version = params[0];
        const isDraft = load.data?.agent.draftVersion === version;
        setViewingVersion(isDraft ? null : version);
        setAgentOverride(data);
        setAssetOverride(null);
        controller.initialize(data);
        setPromptMode(parseGuidedPrompt(data.spec.systemPrompt).compatible ? 'guided' : 'free');
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const save = useRequest(
    async () => {
      if (!resourceId || !controller.draft || !load.data || viewingVersion !== null) return;
      controller.markSaving();
      await Promise.all([
        agentService.updateAgentInfo(
          resourceId,
          controller.draft.name.trim(),
          controller.draft.description.trim()
        ),
        agentService.updateAgentSpec(
          resourceId,
          load.data.agent.draftVersion,
          controller.draft.spec
        ),
      ]);
    },
    {
      manual: true,
      onSuccess: () => {
        controller.markSaved();
        toast.success('Agent 已保存');
      },
      onError: (error) => {
        controller.markFailed();
        toast.danger(parseErrorMessage(error));
      },
    }
  );
  const publish = useRequest(
    async () => {
      if (!resourceId) return;
      if (controller.isDirty) await save.runAsync();
      await agentService.publishVersion(resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('Agent 已发布');
        load.refresh();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const refreshAssetsOnly = async () => {
    if (!resourceId) return;
    try {
      const latest = await agentService.getAgentDetail(resourceId);
      setAssetOverride(latest.assets);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };
  const upload = useRequest(
    async (files: File[]) => {
      if (!resourceId || !load.data) return;
      for (const file of files)
        await agentService.uploadAsset(resourceId, load.data.agent.draftVersion, { file });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('附件已上传');
        void refreshAssetsOnly();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const remove = useRequest(
    async (id: string) => {
      if (!resourceId || !load.data) return;
      await agentService.deleteAssets(resourceId, load.data.agent.draftVersion, [id]);
    },
    {
      manual: true,
      onSuccess: () => {
        setDeleteAssetId(null);
        toast.success('附件已删除');
        void refreshAssetsOnly();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const blocker = useBlocker(controller.isDirty);
  useBeforeUnload((event) => {
    if (controller.isDirty) event.preventDefault();
  });
  const handleSaveAndLeave = async () => {
    try {
      await save.runAsync();
      blocker.proceed?.();
    } catch {
      // 保存失败时 save request 的 onError 会展示错误提示；留在当前页面继续编辑。
    }
  };
  const setSpec = (spec: AgentSpec) => controller.setDraft((current) => ({ ...current, spec }));
  const requestMode = (mode: PromptMode) => {
    if (mode === promptMode) return;
    if (mode === 'free') {
      setPromptMode('free');
      return;
    }
    if (controller.draft && parseGuidedPrompt(controller.draft.spec.systemPrompt).compatible) {
      setPromptMode('guided');
      return;
    }
    setPromptResetOpen(true);
  };
  const handleSaveDraftForDebug = useMemoizedFn(async () => {
    try {
      await save.runAsync();
      return true;
    } catch {
      return false;
    }
  });
  const handleSave = useMemoizedFn(() => save.run());
  const handlePublish = useMemoizedFn(() => publish.run());
  const versionItems = useMemo(() => {
    if (!load.data) return [];
    const { draftVersion, publishedVersion } = load.data.agent;
    const items = [
      {
        key: `v${draftVersion}`,
        version: draftVersion,
        current: viewingVersion === null,
      },
    ];
    for (let version = publishedVersion; version >= 1; version -= 1) {
      if (version === draftVersion) continue;
      items.push({
        key: `v${version}`,
        version,
        current: viewingVersion === version,
      });
    }
    return items;
  }, [load.data, viewingVersion]);
  const disabledVersionKeys = useMemo(
    () =>
      load.data?.agent.isOwner ? new Set<string>() : new Set(versionItems.map((item) => item.key)),
    [load.data?.agent.isOwner, versionItems]
  );
  const handleVersionSelect = useMemoizedFn((version: number) => {
    if (!load.data || version === (viewingVersion ?? load.data.agent.draftVersion)) return;
    if (controller.isDirty) {
      toast.warning('请先保存或放弃当前修改，再切换版本');
      return;
    }
    runSwitchVersion(version);
  });
  const displayAgent = agentOverride ?? load.data?.agent;
  const currentDraftAgent = useMemo<ChatAgentOption | null>(() => {
    if (!load.data || !controller.draft) return null;
    const skillPolicy = controller.draft.spec.toolAndSkillPolicy;
    const defaultSkillIds = Array.from(
      new Set([
        ...(skillPolicy.onDemandSkillIds ?? []),
        ...(skillPolicy.forceEnabledSkillIds ?? []),
      ])
    );
    return {
      agentId: `current-agent-draft-${load.data.agent.resourceId}`,
      agentType: 'PERSONAL',
      source: 'CURRENT_DRAFT',
      resourceId: load.data.agent.resourceId,
      agentVersion: load.data.agent.draftVersion,
      label: load.data.agent.title || controller.draft.name || '当前 Agent',
      defaultSkillIds,
    };
  }, [controller.draft, load.data]);
  const headerConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      chatAgentDebug:
        currentDraftAgent && viewingVersion === null
          ? {
              agent: currentDraftAgent,
              isDirty: controller.isDirty,
              isSaving: save.loading,
              onSaveDraft: handleSaveDraftForDebug,
            }
          : undefined,
      header: displayAgent
        ? {
            resource: {
              resourceId: displayAgent.resourceId,
              resourceName: displayAgent.title,
              resourceIconType: 'agent',
              currentActions: displayAgent.currentActions,
              copyVersion: displayAgent.version,
              permissionResourceType: RESOURCE_KIND.AGENT,
              ownerId: displayAgent.ownerId,
              titleMeta: (
                <span className={styles.saveStatus}>{saveText(controller.savePhase)}</span>
              ),
              actions: displayAgent.isOwner ? (
                <div className={styles.headerActions}>
                  <Button
                    variant="secondary"
                    isDisabled={
                      viewingVersion !== null ||
                      !controller.isDirty ||
                      save.loading ||
                      versionLoading
                    }
                    onPress={handleSave}
                  >
                    <Save size={15} />
                    保存
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={
                      viewingVersion !== null || publish.loading || save.loading || versionLoading
                    }
                    onPress={handlePublish}
                  >
                    <Upload size={15} />
                    发布
                  </Button>
                  <VersionDropdown
                    items={versionItems}
                    disabledKeys={disabledVersionKeys}
                    formatVersion={(version) => `v${version}.0`}
                    onSelect={handleVersionSelect}
                  />
                </div>
              ) : undefined,
            },
          }
        : undefined,
    }),
    [
      controller.isDirty,
      controller.savePhase,
      currentDraftAgent,
      handlePublish,
      handleSave,
      handleSaveDraftForDebug,
      displayAgent,
      disabledVersionKeys,
      handleVersionSelect,
      publish.loading,
      save.loading,
      versionItems,
      versionLoading,
      viewingVersion,
    ]
  );
  useResourceHostLayoutConfig(headerConfig);
  if (!resourceId)
    return (
      <div className={styles.overlay}>
        <ResultState
          status="info"
          title="创建 Agent"
          extra={
            <Button variant="primary" onPress={() => setCreateOpen(true)}>
              创建新 Agent
            </Button>
          }
        />
        <DriveCreate
          type="agent"
          isOpen={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) navigate('/app/drive', { replace: true });
          }}
          onSuccess={(id) =>
            openInWorkspace({
              resourceId: id,
              resourceType: RESOURCE_KIND.AGENT,
              driveLocation: { scope: useWorkspaceNavigationStore.getState().location.scope },
              replace: true,
            })
          }
        />
      </div>
    );
  if (load.error)
    return (
      <div className={styles.overlay}>
        <ResultState
          status="warning"
          title="无法打开 Agent"
          subTitle={parseErrorMessage(load.error)}
          extra={
            <Link to="/app/drive">
              <Button variant="secondary">返回云盘</Button>
            </Link>
          }
        />
      </div>
    );
  if ((load.loading && !load.data) || !load.data || !controller.draft)
    return (
      <div className={styles.overlay}>
        <Spin size="large" />
        <span>正在加载 Agent...</span>
      </div>
    );
  const disabled =
    !load.data.agent.isOwner ||
    viewingVersion !== null ||
    save.loading ||
    publish.loading ||
    versionLoading;
  return (
    <div className={styles.page}>
      <AgentSectionNav items={anchors} scrollContainerId={AGENT_SCROLL_CONTAINER_ID} />
      <main id={AGENT_SCROLL_CONTAINER_ID} className={styles.content}>
        <BasicInfoSection
          name={controller.draft.name}
          description={controller.draft.description}
          spec={controller.draft.spec}
          disabled={disabled}
          onNameChange={(value) => controller.setDraft((current) => ({ ...current, name: value }))}
          onDescriptionChange={(value) =>
            controller.setDraft((current) => ({ ...current, description: value }))
          }
          onSpecChange={setSpec}
        />
        <SystemPromptSection
          markdown={controller.draft.spec.systemPrompt}
          mode={promptMode}
          disabled={disabled}
          onModeRequest={requestMode}
          onMarkdownChange={(value) => setSpec({ ...controller.draft!.spec, systemPrompt: value })}
        />
        <ModelSection
          spec={controller.draft.spec}
          models={load.data.models}
          disabled={disabled}
          onChange={setSpec}
        />
        <CapabilitiesSection
          spec={controller.draft.spec}
          tools={load.data.tools}
          skills={load.data.skills}
          disabled={disabled}
          onChange={setSpec}
        />
        <MemorySection spec={controller.draft.spec} disabled={disabled} onChange={setSpec} />
        <AssetsSection
          assets={assetOverride ?? displayAgent?.assets ?? []}
          disabled={disabled}
          uploading={upload.loading}
          onUpload={(files) => upload.run(files)}
          onDelete={setDeleteAssetId}
        />
      </main>
      <AppAlertDialog
        type="danger"
        isOpen={promptResetOpen}
        onOpenChange={setPromptResetOpen}
        title="当前内容无法返回引导填写"
        description="当前 System Prompt 的预设标题结构已损坏。清空并切换将删除现有内容，并从通用预设重新创建。"
        cancelText="继续自由编辑"
        confirmText="清空并切换"
        onConfirm={() => {
          setSpec({
            ...controller.draft!.spec,
            systemPrompt: buildGuidedPrompt(DEFAULT_GUIDED_PROMPT_FIELDS, true),
          });
          setPromptMode('guided');
          setPromptResetOpen(false);
        }}
      />
      <UnsavedChangesDialog
        type="confirm"
        isOpen={blocker.state === 'blocked'}
        isLoading={save.loading}
        title="保存后离开页面？"
        description="当前 Agent 有未保存修改。保存后再离开可避免丢失本次编辑。"
        cancelText="取消"
        discardText="放弃更改"
        confirmText="保存并退出"
        onCancel={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
        onConfirm={() => void handleSaveAndLeave()}
      />
      <AppAlertDialog
        type="danger"
        isOpen={deleteAssetId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteAssetId(null);
        }}
        title="删除附件"
        description="确定从当前 Agent 草稿中删除这个附件吗？"
        confirmText="删除"
        isConfirmLoading={remove.loading}
        onConfirm={() => {
          if (deleteAssetId) remove.run(deleteAssetId);
        }}
      />
    </div>
  );
}
