import React, { useCallback, useMemo, useState } from 'react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { RiIndentIncrease } from 'react-icons/ri';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { Message, Model } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import {
  clearNewChatSessionStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNoteSelectionStore,
} from '@/store';
import { useChatSession } from '@/session/chat/useChatSession';
import { mapApiModelsToFlatModels } from '@/services/Chat';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import {
  HISTORY_PAGE_SIZE,
  buildPanelMessages,
  collectMessagesPlainText,
  isSessionInvalidMessage,
  mapHistoryMessage,
  type ModelMeta,
} from './ChatPanel';
import styles from './style.module.less';

interface ChatPanelProps {
  collapsed: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ collapsed }) => {
  const chatService = useChatService();
  const messageApi = useAppMessage();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
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
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPage, setHistoryTotalPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

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
      chatService.listHistoryMessages({
        sessionId,
        page,
        size: HISTORY_PAGE_SIZE,
      }),
    {
      manual: true,
    }
  );
  const { runAsync: runCreateSession } = useRequest(() => chatService.createSession(), {
    manual: true,
  });
  const { data: modelListData } = useRequest(() => chatService.getModels());

  const modelMetaMap = useMemo<Record<string, ModelMeta>>(() => {
    const models = mapApiModelsToFlatModels(modelListData);
    return models.reduce<Record<string, ModelMeta>>((acc, model) => {
      acc[model.id] = {
        provider: model.provider,
        name: model.name,
      };
      return acc;
    }, {});
  }, [modelListData]);

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
          meta: {
            ...message.meta,
            modelName: modelMeta.name,
            provider: modelMeta.provider,
          },
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

  const loadHistoryMessages = useCallback(
    async (sessionId: string) => {
      try {
        const payload = await runLoadSessionHistory(sessionId, 1);
        setHistoryMessages(
          payload.list.map((m) => mapHistoryMessage(m, { modelMetaMap, currentModel }))
        );
        setHistoryPage(payload.page ?? 1);
        setHistoryTotalPage(payload.total_page ?? 1);
      } catch (error) {
        const errorMessage = parseErrorMessage(error, '拉取历史消息失败');
        if (isSessionInvalidMessage(errorMessage)) {
          clearCurrentSession();
          setHistoryMessages([]);
          setHistoryPage(1);
          setHistoryTotalPage(1);
          setLiveMessages([]);
          return;
        }
        messageApi.error(errorMessage);
        setHistoryMessages([]);
        setHistoryPage(1);
        setHistoryTotalPage(1);
      }
    },
    [
      clearCurrentSession,
      currentModel,
      messageApi,
      modelMetaMap,
      runLoadSessionHistory,
      setLiveMessages,
    ]
  );

  const loadMoreHistoryMessages = useCallback(async () => {
    if (!currentSessionId) return;
    if (loadingMoreHistory) return;
    if (historyPage >= historyTotalPage) return;

    const nextPage = historyPage + 1;
    setLoadingMoreHistory(true);

    try {
      const payload = await runLoadSessionHistory(currentSessionId, nextPage);
      const olderMessages = payload.list.map((m) =>
        mapHistoryMessage(m, { modelMetaMap, currentModel })
      );
      setHistoryMessages((previousMessages) => [...olderMessages, ...previousMessages]);
      setHistoryPage(payload.page ?? nextPage);
      setHistoryTotalPage(payload.total_page ?? historyTotalPage);
    } catch (error) {
      messageApi.error(parseErrorMessage(error, '加载更多历史消息失败'));
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [
    currentModel,
    currentSessionId,
    historyPage,
    historyTotalPage,
    loadingMoreHistory,
    messageApi,
    modelMetaMap,
    runLoadSessionHistory,
  ]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!currentModel) return;
      let targetSessionId = currentSessionId;

      if (!targetSessionId) {
        try {
          const createdSession = await runCreateSession();
          targetSessionId = createdSession.id;
          useNewChatSessionStore.getState().setNewChatSession({
            id: createdSession.id,
            title: createdSession.title,
          });
          setCurrentSession({ id: createdSession.id, title: createdSession.title });
        } catch (error) {
          messageApi.error(parseErrorMessage(error, '新建聊天失败'));
          return;
        }
      }

      const sendPromise = sendSessionMessage(text, {
        model: currentModel.id,
        enableSelected: hasSelectedContext,
        sessionId: targetSessionId,
      });
      if (hasSelectedContext) {
        clearSelectedText(targetSessionId);
      }
      await sendPromise;
    },
    [
      clearSelectedText,
      currentModel,
      currentSessionId,
      hasSelectedContext,
      messageApi,
      runCreateSession,
      sendSessionMessage,
      setCurrentSession,
    ]
  );

  const handleClearSelectedContext = useCallback(() => {
    if (!currentSessionId) return;
    clearSelectedText(currentSessionId);
  }, [clearSelectedText, currentSessionId]);

  const handleCollapsePanel = useCallback(() => {
    setChatPanelCollapsed(true);
  }, [setChatPanelCollapsed]);

  useMount(() => {
    if (!currentSessionId) return;
    setHistoryMessages([]);
    setHistoryPage(1);
    setHistoryTotalPage(1);
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
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
  }, [currentSessionId, loadHistoryMessages, setLiveMessages]);

  return (
    <div className={styles.panel}>
      <div className={`${styles.header} ${collapsed ? styles.collapsedHeader : ''}`}>
        <div className={styles.headerLeft}>
          {!collapsed && (
            <button
              type="button"
              onClick={handleCollapsePanel}
              className={styles.triggerBtn}
              aria-label="收起聊天面板"
            >
              <RiIndentIncrease size={18} />
            </button>
          )}
          {!collapsed && (
            <div className={styles.titleWrap}>
              <div className={styles.title}>{currentSessionTitle || '新对话'}</div>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (
        <>
          <div className={styles.content}>
            <MessageList
              messages={messages}
              canLoadMoreHistory={Boolean(currentSessionId) && historyPage < historyTotalPage}
              loadingMoreHistory={loadingMoreHistory}
              onLoadMoreHistory={loadMoreHistoryMessages}
            />
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
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
