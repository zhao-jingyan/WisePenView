import React, { useCallback, useMemo, useState } from 'react';
import { useMount, useRequest, useUpdateEffect } from 'ahooks';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { Message, Model, MessageRole } from '@/components/ChatPanel/index.type';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useCurrentChatSessionStore, useNoteSelectionStore } from '@/store';
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

const ChatPanel: React.FC<ChatPanelProps> = ({ collapsed }) => {
  const chatService = useChatService();
  const messageApi = useAppMessage();
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
    async (sessionId: string) =>
      chatService.listHistoryMessages({
        sessionId,
        page: 1,
        size: 100,
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

  const toTimestamp = useCallback((createdAt: string): number => {
    const parsed = Date.parse(createdAt);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, []);

  const getStringValue = useCallback((value: unknown): string => {
    if (typeof value === 'string') return value;
    return '';
  }, []);

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
    (message: unknown): { content: string; reasoningContent: string; errorMessage: string } => {
      if (typeof message !== 'object' || message == null) {
        return { content: '', reasoningContent: '', errorMessage: '' };
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
          }
        });
      }

      const content =
        textChunks.join('') ||
        getStringValue(typedMessage.text) ||
        getStringValue(typedMessage.content);
      const reasoningContent = reasoningChunks.join('') || getStringValue(typedMessage.reasoning);
      const errorMessage = errorChunks.join('') || getErrorMessage(typedMessage.error);

      return { content, reasoningContent, errorMessage };
    },
    [getErrorMessage, getStringValue]
  );

  const mapHistoryMessage = useCallback(
    (message: MessageResponse): Message => {
      const historyModelId = normalizeModelId(message.model_id);
      const modelMetaFromMap = historyModelId ? modelMetaMap[historyModelId] : undefined;
      return {
        id: message.id,
        role: mapRole(message.role),
        content: message.content || '',
        createAt: toTimestamp(message.created_at),
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
        const payload = await runLoadSessionHistory(sessionId);
        setHistoryMessages(payload.list.map(mapHistoryMessage));
      } catch (error) {
        const errorMessage = parseErrorMessage(error, '拉取历史消息失败');
        if (isSessionInvalidMessage(errorMessage)) {
          clearCurrentSession();
          setHistoryMessages([]);
          setLiveMessages([]);
          return;
        }
        messageApi.error(errorMessage);
        setHistoryMessages([]);
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

  useMount(() => {
    if (!currentSessionId) return;
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  });

  useUpdateEffect(() => {
    if (!currentSessionId) {
      setHistoryMessages([]);
      setLiveMessages([]);
      return;
    }
    setLiveMessages([]);
    void loadHistoryMessages(currentSessionId);
  }, [currentSessionId, loadHistoryMessages, setLiveMessages]);

  return (
    <div className={styles.panel}>
      <div className={`${styles.header} ${collapsed ? styles.collapsedHeader : ''}`}>
        <div className={styles.headerLeft}>
          {!collapsed && (
            <div className={styles.titleWrap}>
              <div className={styles.title}>{currentSessionTitle || '新建对话'}</div>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (
        <>
          <div className={styles.content}>
            <MessageList messages={messages} />
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
