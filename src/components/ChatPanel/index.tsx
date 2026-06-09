import type { ChatPanelProps, Message, Model } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/domains';
import {
  buildAdvancedSkillTreeGroups,
  buildDefaultPersonalAgent,
  getPrimarySkillsForAgent,
} from '@/domains/Chat';
import { useChatSession } from '@/domains/Chat/session/useChatSession';
import {
  clearChatCapabilityStore,
  clearChatPageStore,
  clearNewChatSessionStore,
  useAdvancedModeStore,
  useChatAgentStore,
  useChatCapabilityStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNoteSelectionStore,
} from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { IndentIncrease } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedModeToggle from './AdvancedModeToggle';
import AgentSelector from './AgentSelector';
import ChatInput from './ChatInput';
import type { SendOptions } from './ChatInput/index.type';
import {
  HISTORY_PAGE_SIZE,
  buildPanelMessages,
  collectMessagesPlainText,
  isSessionInvalidMessage,
  mapHistoryMessage,
  type ModelMeta,
} from './ChatPanel';
import MessageList from './MessageList';
import NewChatButton from './NewChatButton';
import styles from './style.module.less';

const DEFAULT_PERSONAL_AGENT = buildDefaultPersonalAgent();

function ChatPanel({ collapsed, fullWidth = false, onNewChat }: ChatPanelProps) {
  const navigate = useNavigate();
  const chatService = useChatService();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const currentSessionTitle = useCurrentChatSessionStore((state) => state.currentSessionTitle);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const enableSelectedText = useNoteSelectionStore((state) =>
    currentSessionId ? Boolean(state.enableSelectedTextByResourceId[currentSessionId]) : false
  );
  const selectedContextText = useNoteSelectionStore((state) =>
    currentSessionId ? (state.selectedTextByResourceId[currentSessionId] ?? '') : ''
  );
  const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);
  const draftAgent = useChatAgentStore((state) => state.draftAgent);
  const sessionAgentBySessionId = useChatAgentStore((state) => state.sessionAgentBySessionId);
  const setDraftAgent = useChatAgentStore((state) => state.setDraftAgent);
  const setSessionAgent = useChatAgentStore((state) => state.setSessionAgent);
  const advancedMode = useAdvancedModeStore((state) => state.advancedMode);
  const selectedSkills = useChatCapabilityStore((state) => state.selectedSkills);
  const selectedTools = useChatCapabilityStore((state) => state.selectedTools);

  useUpdateEffect(() => {
    clearChatCapabilityStore();
  }, [currentSessionId]);

  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPage, setHistoryTotalPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const { data: workspace, loading: loadingWorkspace } = useRequest(
    () => chatService.getWorkspace(),
    { refreshDeps: [] }
  );
  const groups = workspace?.groups ?? [];
  const personalAgentOptions = workspace?.personalAgents ?? [];
  const groupAgentOptions = workspace?.groupAgents ?? [];
  const agentOptions = [DEFAULT_PERSONAL_AGENT, ...personalAgentOptions, ...groupAgentOptions];
  const agentOptionsLoaded = !loadingWorkspace;
  const selectedAgent = (() => {
    const storedAgent = currentSessionId ? sessionAgentBySessionId[currentSessionId] : draftAgent;
    if (!storedAgent) return DEFAULT_PERSONAL_AGENT;
    if (storedAgent.isDefault) return DEFAULT_PERSONAL_AGENT;

    const freshAgent = agentOptions.find((agent) => agent.agentId === storedAgent.agentId);
    if (freshAgent) return freshAgent;

    return agentOptionsLoaded ? DEFAULT_PERSONAL_AGENT : storedAgent;
  })();

  const allSkills = workspace?.skills ?? [];
  const primarySkills = getPrimarySkillsForAgent(allSkills, selectedAgent);
  const advancedSkillGroups = buildAdvancedSkillTreeGroups(
    allSkills,
    groups,
    selectedAgent,
    primarySkills
  );
  const allowedSkillIds = primarySkills.map((skill) => skill.skillId);

  const {
    messages: liveMessages,
    status,
    setMessages: setLiveMessages,
    sendSessionMessage,
  } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.id,
  });

  const { runAsync: runLoadSessionHistory } = useRequest(
    async (sessionId: string, page = 1) =>
      chatService.listHistoryMessages({ sessionId, page, size: HISTORY_PAGE_SIZE }),
    { manual: true }
  );
  const { runAsync: runCreateSession } = useRequest(() => chatService.createSession(), {
    manual: true,
  });
  const { data: models = [] } = useRequest(() => chatService.getModels());

  const modelMetaMap = useMemo<Record<string, ModelMeta>>(() => {
    return models.reduce<Record<string, ModelMeta>>((acc, model) => {
      acc[model.id] = { provider: model.provider, name: model.name };
      return acc;
    }, {});
  }, [models]);

  useUpdateEffect(() => {
    if (Object.keys(modelMetaMap).length === 0) return;
    setHistoryMessages((previousMessages) =>
      previousMessages.map((message) => {
        if (message.role !== 'ai') return message;
        const modelId = message.meta?.modelId;
        if (!modelId) return message;
        const modelMeta = modelMetaMap[modelId];
        if (!modelMeta) return message;
        if (
          message.meta?.modelName === modelMeta.name &&
          message.meta?.provider === modelMeta.provider
        ) {
          return message;
        }
        return {
          ...message,
          meta: { ...message.meta, modelName: modelMeta.name, provider: modelMeta.provider },
        };
      })
    );
  }, [modelMetaMap]);

  const messages = buildPanelMessages(historyMessages, liveMessages, currentModel, status);
  const hasRenderableChatContent = collectMessagesPlainText(messages).trim().length > 0;

  useUpdateEffect(() => {
    if (currentSessionId == null || currentSessionId === '') return;
    const pendingId = useNewChatSessionStore.getState().newChatSessionId;
    if (pendingId !== currentSessionId) return;
    if (!hasRenderableChatContent) return;
    clearNewChatSessionStore();
  }, [currentSessionId, hasRenderableChatContent]);

  const sending = status === 'submitted' || status === 'streaming';
  const chatInputModelId = currentModel?.id ?? '';
  const hasSelectedContext = enableSelectedText && Boolean(selectedContextText.trim());
  const panelTitle = currentSessionTitle || '新对话';

  const loadHistoryMessages = async (sessionId: string) => {
    try {
      const payload = await runLoadSessionHistory(sessionId, 1);
      setHistoryMessages(
        payload.list.map((m) => mapHistoryMessage(m, { modelMetaMap, currentModel }))
      );
      setHistoryPage(payload.page ?? 1);
      setHistoryTotalPage(payload.totalPage ?? 1);
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      if (isSessionInvalidMessage(errorMessage)) {
        clearCurrentSession();
        setHistoryMessages([]);
        setHistoryPage(1);
        setHistoryTotalPage(1);
        setLiveMessages([]);
        return;
      }
      toast.danger(errorMessage);
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
    }
  };

  const loadMoreHistoryMessages = async () => {
    if (!currentSessionId || loadingMoreHistory || historyPage >= historyTotalPage) return;

    const nextPage = historyPage + 1;
    setLoadingMoreHistory(true);

    try {
      const payload = await runLoadSessionHistory(currentSessionId, nextPage);
      const olderMessages = payload.list.map((m) =>
        mapHistoryMessage(m, { modelMetaMap, currentModel })
      );
      setHistoryMessages((previousMessages) => [...olderMessages, ...previousMessages]);
      setHistoryPage(payload.page ?? nextPage);
      setHistoryTotalPage(payload.totalPage ?? historyTotalPage);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const handleSend = async (text: string, opts?: SendOptions) => {
    if (!currentModel) return;
    let targetSessionId = currentSessionId;
    const targetAgent = selectedAgent ?? DEFAULT_PERSONAL_AGENT;

    if (!targetSessionId) {
      try {
        const createdSession = await runCreateSession();
        targetSessionId = createdSession.id;
        useNewChatSessionStore.getState().setNewChatSession({
          id: createdSession.id,
          title: createdSession.title,
        });
        setCurrentSession({ id: createdSession.id, title: createdSession.title });
        setSessionAgent(createdSession.id, targetAgent);
        setChatPanelDraftOpen(false);
        if (fullWidth) {
          navigate(`/app/chat/${createdSession.id}`, { replace: true });
        }
      } catch (error) {
        toast.danger(parseErrorMessage(error));
        return;
      }
    }

    const selectedSkillIds = selectedSkills.map((s) => s.skillId);
    const selectedToolIds = selectedTools.map((t) => t.toolId);

    const sendPromise = sendSessionMessage(text, {
      model: currentModel.id,
      enableSelected: hasSelectedContext,
      sessionId: targetSessionId,
      agentContext: {
        agent_id: targetAgent.agentId,
        agent_type: targetAgent.agentType,
        group_id: targetAgent.groupId,
        advanced_mode_enabled: advancedMode,
        tools: selectedToolIds.length > 0 ? selectedToolIds : undefined,
      },
      allowedSkillIds,
      selectedSkillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      pendingImages: opts?.pendingImages,
    });

    if (hasSelectedContext) {
      clearSelectedText(targetSessionId);
    }
    await sendPromise;
  };

  const handleAgentChange = (nextAgent: (typeof agentOptions)[number]) => {
    if (currentSessionId) {
      setSessionAgent(currentSessionId, nextAgent);
      return;
    }
    setDraftAgent(nextAgent);
  };

  const handleClearSelectedContext = () => {
    if (!currentSessionId) return;
    clearSelectedText(currentSessionId);
  };

  const handleCollapsePanel = () => {
    setChatPanelCollapsed(true);
    if (!currentSessionId) {
      setChatPanelDraftOpen(false);
    }
  };

  useMount(() => {
    if (!currentSessionId) return;
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
    clearChatPageStore();
    if (!currentSessionId) {
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
      setLiveMessages([]);
      return;
    }
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  }, [currentSessionId]);

  useUpdateEffect(() => {
    if (currentSessionId) return;
    if (!chatPanelDraftOpen) {
      setHistoryMessages([]);
      setHistoryPage(1);
      setHistoryTotalPage(1);
      setLiveMessages([]);
    }
  }, [chatPanelDraftOpen, currentSessionId, setLiveMessages]);

  return (
    <div className={`${styles.panel} ${fullWidth ? styles.fullWidth : ''}`}>
      <div className={`${styles.header} ${collapsed ? styles.collapsedHeader : ''}`}>
        <div className={styles.headerLeft}>
          {!collapsed && !fullWidth && (
            <button
              type="button"
              onClick={handleCollapsePanel}
              className={styles.triggerBtn}
              aria-label="收起聊天面板"
            >
              <IndentIncrease size={18} />
            </button>
          )}
          {!collapsed && (
            <div className={styles.titleWrap}>
              <div className={styles.title}>{panelTitle}</div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className={styles.headerRight}>
            <AdvancedModeToggle compact={!fullWidth} />
            <div className={styles.agentSelectorShell}>
              <AgentSelector
                compact={!fullWidth}
                options={agentOptions}
                selectedAgent={selectedAgent}
                onChange={handleAgentChange}
              />
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className={styles.content}>
            <div className={styles.contentTopBar}>
              <NewChatButton onClick={onNewChat} compact={!fullWidth} />
            </div>

            <div className={styles.messageViewport}>
              <MessageList
                messages={messages}
                canLoadMoreHistory={Boolean(currentSessionId) && historyPage < historyTotalPage}
                loadingMoreHistory={loadingMoreHistory}
                onLoadMoreHistory={loadMoreHistoryMessages}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <ChatInput
              currentModelId={chatInputModelId}
              onModelChange={setCurrentModel}
              onSend={handleSend}
              sending={sending}
              hasSelectedContext={hasSelectedContext}
              selectedContextText={selectedContextText}
              onClearSelectedContext={handleClearSelectedContext}
              selectedAgent={selectedAgent}
              primarySkills={primarySkills}
              advancedMode={advancedMode}
              advancedSkillGroups={advancedSkillGroups}
              currentModelVision={currentModel?.vision ?? false}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;
