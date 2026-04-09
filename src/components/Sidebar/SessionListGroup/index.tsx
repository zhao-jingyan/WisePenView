import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Button, Menu } from 'antd';
import { useMount, useRequest } from 'ahooks';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { ChatSession } from '@/services/Chat';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import SessionMenuItem from '../SessionMenuItem';
import type { SessionListGroupProps, SessionListGroupRef } from './index.type';
import styles from './style.module.less';

const SESSION_PAGE_SIZE = 20;

const SessionListGroup = forwardRef<SessionListGroupRef, SessionListGroupProps>(
  ({ activeSessionMenuKey, onActiveSessionMenuKeyChange }, ref) => {
    const chatService = useChatService();
    const messageApi = useAppMessage();
    const [sessionItems, setSessionItems] = useState<ChatSession[]>([]);
    const [sessionPage, setSessionPage] = useState(1);
    const [sessionTotalPage, setSessionTotalPage] = useState(1);
    const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);

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

    const loadSessionPage = useCallback(
      async (page: number, append: boolean) => {
        if (append) {
          setLoadingMoreSessions(true);
        }
        try {
          const payload = await runListSessions(page);
          setSessionPage(payload.page);
          setSessionTotalPage(payload.total_page || 1);
          setSessionItems((prev) => {
            if (!append) {
              return payload.list;
            }
            const existingIds = new Set(prev.map((item) => item.id));
            const extra = payload.list.filter((item) => !existingIds.has(item.id));
            return [...prev, ...extra];
          });
        } catch (err) {
          messageApi.error(parseErrorMessage(err, '拉取会话列表失败'));
        } finally {
          if (append) {
            setLoadingMoreSessions(false);
          }
        }
      },
      [messageApi, runListSessions]
    );

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          await loadSessionPage(1, false);
        },
      }),
      [loadSessionPage]
    );

    useMount(() => {
      void loadSessionPage(1, false);
    });

    const pinnedSessions = sessionItems.filter((item) => item.is_pinned);
    const normalSessions = sessionItems.filter((item) => !item.is_pinned);
    const hasMoreSessions = sessionPage < sessionTotalPage;

    const handleDeleted = useCallback(
      (sessionId: string) => {
        if (activeSessionMenuKey === `session-${sessionId}`) {
          onActiveSessionMenuKeyChange(undefined);
        }
      },
      [activeSessionMenuKey, onActiveSessionMenuKeyChange]
    );

    if (sessionListLoading && sessionItems.length === 0) {
      return (
        <Menu.ItemGroup key="recent-session" title="聊天记录">
          <Menu.Item key="session-loading" disabled>
            会话加载中...
          </Menu.Item>
        </Menu.ItemGroup>
      );
    }

    return (
      <>
        {pinnedSessions.length > 0 && (
          <Menu.ItemGroup key="pinned-session" title="置顶会话">
            {pinnedSessions.map((session) => (
              <Menu.Item
                key={`session-${session.id}`}
                onClick={() => onActiveSessionMenuKeyChange(`session-${session.id}`)}
              >
                <SessionMenuItem
                  session={session}
                  onUpdated={async () => {
                    await loadSessionPage(1, false);
                  }}
                  onDeleted={handleDeleted}
                />
              </Menu.Item>
            ))}
          </Menu.ItemGroup>
        )}

        <Menu.ItemGroup key="recent-session" title="聊天记录">
          {normalSessions.length === 0 ? (
            <Menu.Item key="empty-normal-session" disabled>
              暂无会话
            </Menu.Item>
          ) : (
            normalSessions.map((session) => (
              <Menu.Item
                key={`session-${session.id}`}
                onClick={() => onActiveSessionMenuKeyChange(`session-${session.id}`)}
              >
                <SessionMenuItem
                  session={session}
                  onUpdated={async () => {
                    await loadSessionPage(1, false);
                  }}
                  onDeleted={handleDeleted}
                />
              </Menu.Item>
            ))
          )}

          {(hasMoreSessions || loadingMoreSessions) && (
            <Menu.Item key="session-load-more" disabled>
              <Button
                type="text"
                className={styles.sessionLoadMoreBtn}
                loading={loadingMoreSessions}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (loadingMoreSessions || !hasMoreSessions) return;
                  void loadSessionPage(sessionPage + 1, true);
                }}
              >
                {hasMoreSessions ? '加载更多' : '没有更多了'}
              </Button>
            </Menu.Item>
          )}
        </Menu.ItemGroup>
      </>
    );
  }
);

SessionListGroup.displayName = 'SessionListGroup';

export default SessionListGroup;
