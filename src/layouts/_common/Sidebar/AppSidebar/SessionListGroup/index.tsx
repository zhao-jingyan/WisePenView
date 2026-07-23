import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { useNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import { useChatService } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox, ListBoxItem, ListBoxSection, toast } from '@heroui/react';
import { useMount, useRequest } from 'ahooks';
import clsx from 'clsx';
import { useImperativeHandle, useState, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../AppSidebarTabs/style.module.less';
import SessionMenuItem from '../SessionMenuItem';
import type { SessionListGroupProps, SessionListGroupRef } from './index.type';

const SESSION_PAGE_SIZE = 20;

const useSessionListGroup = () => {
  const chatService = useChatService();
  const [sessionItems, setSessionItems] = useState<ChatSession[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPage, setSessionTotalPage] = useState(1);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const navigate = useNavigate();

  const { runAsync: runListSessions, loading: sessionListLoading } = useRequest(
    async (page: number) =>
      chatService.listSessions({
        page,
        size: SESSION_PAGE_SIZE,
      }),
    {
      manual: true,
    }
  );

  const loadSessionPage = async (page: number, append: boolean) => {
    if (append) {
      setLoadingMoreSessions(true);
    }
    try {
      const payload = await runListSessions(page);
      setSessionPage(payload.page);
      setSessionTotalPage(payload.totalPage);
      // 始终以 store 最新 sessionId 为准，避免闭包里读到旧值后回写错误会话。
      const latestSessionId = useCurrentChatSessionStore.getState().currentSessionId;
      if (latestSessionId) {
        const currentSession = payload.list.find((item) => item.id === latestSessionId);
        if (currentSession) {
          setCurrentSession({ id: currentSession.id, title: currentSession.title });
        }
      }
      setSessionItems((prev) => {
        if (!append) {
          return payload.list;
        }
        const existingIds = new Set(prev.map((item) => item.id));
        const extra = payload.list.filter((item) => !existingIds.has(item.id));
        return [...prev, ...extra];
      });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      if (append) {
        setLoadingMoreSessions(false);
      }
    }
  };

  const refresh = async () => {
    await loadSessionPage(1, false);
  };

  useMount(() => {
    void refresh();
  });

  const hasMoreSessions = sessionPage < sessionTotalPage;

  const handleDeleted = (sessionId: string) => {
    if (currentSessionId === sessionId) {
      clearCurrentSession();
    }
    useNewChatSessionStore.getState().clearNewChatSessionById(sessionId);
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession({ id: session.id, title: session.title });
    navigate(`/app/chat/${session.id}`);
  };

  const loadMoreSessions = () => {
    if (loadingMoreSessions || !hasMoreSessions) return;
    void loadSessionPage(sessionPage + 1, true);
  };

  return {
    hasMoreSessions,
    handleDeleted,
    loadMoreSessions,
    loadingMoreSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  };
};

function SessionListGroup({
  ref,
  selectedKeys,
}: SessionListGroupProps & { ref?: Ref<SessionListGroupRef> }) {
  const {
    handleDeleted,
    hasMoreSessions,
    loadMoreSessions,
    loadingMoreSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  } = useSessionListGroup();

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <ListBox
      aria-label="会话历史"
      selectionMode="single"
      className={styles.sessionMenu}
      selectedKeys={selectedKeys}
    >
      <ListBoxSection id="recent-session" className={styles.sessionSection}>
        {sessionListLoading && sessionItems.length === 0 ? (
          <ListBoxItem
            key="session-loading"
            id="session-loading"
            textValue="会话加载中..."
            isDisabled
            className={styles.sessionItem}
          >
            会话加载中...
          </ListBoxItem>
        ) : (
          <>
            {sessionItems.length === 0 ? (
              <ListBoxItem
                key="empty-normal-session"
                id="empty-normal-session"
                textValue="暂无会话"
                isDisabled
                className={styles.sessionItem}
              >
                暂无会话
              </ListBoxItem>
            ) : (
              sessionItems.map((session) => (
                <ListBoxItem
                  key={session.id}
                  id={`session-${session.id}`}
                  textValue={session.title || '未命名会话'}
                  className={clsx(styles.sessionItem, styles.sessionItemWithActions)}
                  onPress={() => selectSession(session)}
                >
                  <SessionMenuItem
                    session={session}
                    onUpdated={refresh}
                    onDeleted={handleDeleted}
                  />
                </ListBoxItem>
              ))
            )}
            {(hasMoreSessions || loadingMoreSessions) && (
              <ListBoxItem
                key="session-load-more"
                id="session-load-more"
                textValue={hasMoreSessions ? '加载更多' : '没有更多了'}
                isDisabled
                className={styles.sessionItem}
              >
                <Button
                  variant="secondary"
                  isDisabled={loadingMoreSessions}
                  className={styles.sessionLoadMoreBtn}
                  onPress={() => {
                    loadMoreSessions();
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {hasMoreSessions ? '加载更多' : '没有更多了'}
                </Button>
              </ListBoxItem>
            )}
          </>
        )}
      </ListBoxSection>
    </ListBox>
  );
}

SessionListGroup.displayName = 'SessionListGroup';

export type { SessionListGroupRef };
export default SessionListGroup;
