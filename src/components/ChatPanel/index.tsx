import React, { useCallback, useMemo, useState } from 'react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import { RiIndentIncrease } from 'react-icons/ri';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { Message, Model, MessageRole } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useChatPanelStore, useCurrentChatSessionStore, useNoteSelectionStore } from '@/store';
import { useChatSession } from '@/session/chat/useChatSession';
import { mapApiModelsToFlatModels } from '@/services/Chat';
import type { MessageResponse } from '@/services/Chat';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './style.module.less';

interface ChatPanelProps {
  collapsed: boolean;
}

interface ModelMeta {
  provider: string;
  name: string;
}

const HISTORY_PAGE_SIZE = 100;

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

  const mapRole = useCallback((role: string): MessageRole => {
    if (role === 'user') return 'user';
    return 'ai';
  }, []);

  const toTimestamp = useCallback((createdAt?: string): number => {
    if (!createdAt) return Date.now();
    const parsed = Date.parse(createdAt);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, []);

  const getStringValue = useCallback((value: unknown): string => {
    if (typeof value === 'string') return value;
    return '';
  }, []);

  const pushToolName = useCallback((toolNames: string[], toolName: string) => {
    if (!toolName) return;
    if (toolNames.includes(toolName)) return;
    toolNames.push(toolName);
  }, []);

  const getToolNameFromType = useCallback((partType: string): string => {
    if (!partType.startsWith('tool-')) return '';
    if (partType === 'tool-input-start') return '';
    if (partType === 'tool-input-available') return '';
    if (partType === 'tool-output-available') return '';
    return partType.slice('tool-'.length);
  }, []);

  const getToolNameFromUnknown = useCallback(
    (value: unknown): string => {
      if (typeof value !== 'object' || value == null) return '';
      const typedValue = value as {
        toolName?: unknown;
        tool_name?: unknown;
        name?: unknown;
        type?: unknown;
      };
      const toolName =
        getStringValue(typedValue.toolName) ||
        getStringValue(typedValue.tool_name) ||
        getStringValue(typedValue.name);
      if (toolName) return toolName;
      return getToolNameFromType(getStringValue(typedValue.type));
    },
    [getStringValue, getToolNameFromType]
  );

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

  const normalizeModelId = useCallback(
    (modelId: MessageResponse['model_id']): string | undefined => {
      if (modelId == null) return undefined;
      return String(modelId);
    },
    []
  );

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

  const isSessionInvalidMessage = useCallback((message: string): boolean => {
    const normalizedMessage = message.trim().toLowerCase();
    if (!normalizedMessage) return false;
    return (
      normalizedMessage.includes('会话不存在') ||
      normalizedMessage.includes('目标会话不存在') ||
      normalizedMessage.includes('session 不存在') ||
      (normalizedMessage.includes('session') &&
        (normalizedMessage.includes('not exist') ||
          normalizedMessage.includes('not found') ||
          normalizedMessage.includes('invalid')))
    );
  }, []);

  const getErrorMessage = useCallback(
    (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (typeof value !== 'object' || value == null) return '';
      const typedValue = value as { text?: unknown; message?: unknown; error?: unknown };
      return (
        getStringValue(typedValue.message) ||
        getStringValue(typedValue.text) ||
        getStringValue(typedValue.error)
      );
    },
    [getStringValue]
  );

  const parseLiveMessage = useCallback(
    (
      message: unknown
    ): { content: string; reasoningContent: string; errorMessage: string; toolContent: string } => {
      if (typeof message !== 'object' || message == null) {
        return { content: '', reasoningContent: '', errorMessage: '', toolContent: '' };
      }

      const typedMessage = message as {
        text?: unknown;
        parts?: unknown;
        content?: unknown;
        reasoning?: unknown;
        error?: unknown;
      };

      const textChunks: string[] = [];
      const reasoningChunks: string[] = [];
      const errorChunks: string[] = [];
      const toolNames: string[] = [];

      if (Array.isArray(typedMessage.parts)) {
        typedMessage.parts.forEach((part) => {
          if (typeof part !== 'object' || part == null) return;
          const typedPart = part as {
            type?: unknown;
            text?: unknown;
            reasoning?: unknown;
            error?: unknown;
            errorText?: unknown;
            message?: unknown;
            toolName?: unknown;
            tool_name?: unknown;
            name?: unknown;
          };

          const partType = getStringValue(typedPart.type);
          const textValue = getStringValue(typedPart.text);

          if (partType === 'text') {
            textChunks.push(textValue);
            return;
          }

          if (partType === 'reasoning') {
            reasoningChunks.push(textValue || getStringValue(typedPart.reasoning));
            return;
          }

          if (partType === 'error') {
            errorChunks.push(
              getErrorMessage(
                typedPart.errorText || typedPart.error || typedPart.message || typedPart.text
              )
            );
            return;
          }

          if (partType.startsWith('tool-')) {
            const toolNameFromType = getToolNameFromType(partType);
            const toolNameFromPayload =
              getStringValue(typedPart.toolName) ||
              getStringValue(typedPart.tool_name) ||
              getStringValue(typedPart.name);
            pushToolName(toolNames, toolNameFromPayload || toolNameFromType);
          }
        });
      }

      const content =
        textChunks.join('') ||
        getStringValue(typedMessage.text) ||
        getStringValue(typedMessage.content);
      const reasoningContent = reasoningChunks.join('') || getStringValue(typedMessage.reasoning);
      const errorMessage = errorChunks.join('') || getErrorMessage(typedMessage.error);
      const toolContent = toolNames.join('\n');

      return { content, reasoningContent, errorMessage, toolContent };
    },
    [getErrorMessage, getStringValue, getToolNameFromType, pushToolName]
  );

  const parseHistoryToolCalls = useCallback(
    (toolCalls: MessageResponse['tool_calls']): string | undefined => {
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
      const toolNames: string[] = [];
      toolCalls.forEach((item) => {
        pushToolName(toolNames, getToolNameFromUnknown(item));
      });
      return toolNames.length > 0 ? toolNames.join('\n') : undefined;
    },
    [getToolNameFromUnknown, pushToolName]
  );

  const mapHistoryMessage = useCallback(
    (message: MessageResponse): Message => {
      const parsedMessage = parseLiveMessage(message);
      const errorMessage = parsedMessage.errorMessage.trim();
      const historyModelId = normalizeModelId(message.model_id);
      const modelMetaFromMap = historyModelId ? modelMetaMap[historyModelId] : undefined;
      return {
        id: message.id,
        role: mapRole(message.role),
        content: parsedMessage.content || errorMessage || '',
        reasoningContent: parsedMessage.reasoningContent || undefined,
        toolContent: parsedMessage.toolContent || parseHistoryToolCalls(message.tool_calls),
        createAt: toTimestamp(message.createdAt || message.created_at),
        meta: {
          provider: modelMetaFromMap?.provider || currentModel?.provider || 'openai',
          modelId: historyModelId || currentModel?.id,
          modelName: modelMetaFromMap?.name || currentModel?.name,
        },
      };
    },
    [
      currentModel?.id,
      currentModel?.name,
      currentModel?.provider,
      mapRole,
      modelMetaMap,
      normalizeModelId,
      parseLiveMessage,
      parseHistoryToolCalls,
      toTimestamp,
    ]
  );

  const mappedLiveMessages = useMemo<Message[]>(
    () =>
      liveMessages.map((message, index) => {
        const parsedMessage = parseLiveMessage(message);
        const isLastMessage = message.id === liveMessages[liveMessages.length - 1]?.id;
        const errorMessage = parsedMessage.errorMessage.trim();
        const hasError = Boolean(errorMessage);
        const createAt = index;

        return {
          id: String(message.id),
          role: mapRole(String(message.role)),
          content: parsedMessage.content || (hasError ? errorMessage || '生成失败，请重试。' : ''),
          reasoningContent: parsedMessage.reasoningContent || undefined,
          toolContent: parsedMessage.toolContent || undefined,
          createAt,
          loading: isLastMessage && status === 'streaming',
          error: hasError || (isLastMessage && status === 'error'),
          meta: {
            provider: currentModel?.provider || 'openai',
            modelId: currentModel?.id,
            modelName: currentModel?.name,
          },
        };
      }),
    [
      currentModel?.id,
      currentModel?.name,
      currentModel?.provider,
      liveMessages,
      mapRole,
      parseLiveMessage,
      status,
    ]
  );

  const messages = useMemo<Message[]>(
    () => [...historyMessages, ...mappedLiveMessages],
    [historyMessages, mappedLiveMessages]
  );

  const sending = status === 'submitted' || status === 'streaming';
  const chatInputModelId = currentModel?.id ?? '';
  const hasSelectedContext = enableSelectedText && Boolean(selectedContextText.trim());

  const loadHistoryMessages = useCallback(
    async (sessionId: string) => {
      try {
        const payload = await runLoadSessionHistory(sessionId, 1);
        setHistoryMessages(payload.list.map(mapHistoryMessage));
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
      isSessionInvalidMessage,
      mapHistoryMessage,
      messageApi,
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
      const olderMessages = payload.list.map(mapHistoryMessage);
      setHistoryMessages((previousMessages) => [...olderMessages, ...previousMessages]);
      setHistoryPage(payload.page ?? nextPage);
      setHistoryTotalPage(payload.total_page ?? historyTotalPage);
    } catch (error) {
      messageApi.error(parseErrorMessage(error, '加载更多历史消息失败'));
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [
    currentSessionId,
    historyPage,
    historyTotalPage,
    loadingMoreHistory,
    mapHistoryMessage,
    messageApi,
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
