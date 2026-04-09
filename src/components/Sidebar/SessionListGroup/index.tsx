import React, { useCallback, useMemo, useState } from 'react';
import { Button } from 'antd';
import type { MenuProps } from 'antd';
import { useMount, useRequest } from 'ahooks';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { ChatSession } from '@/services/Chat';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import SessionMenuItem from '../SessionMenuItem';
import type { SessionListGroupProps } from './index.type';
import styles from './style.module.less';

const SESSION_PAGE_SIZE = 20;
type MenuItem = Required<MenuProps>['items'][number];

export const useSessionListGroup = ({
  activeSessionMenuKey,
  onActiveSessionMenuKeyChange,
}: SessionListGroupProps) => {
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

  const refresh = useCallback(async () => {
    await loadSessionPage(1, false);
  }, [loadSessionPage]);

  useMount(() => {
    void refresh();
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

  const createSessionItem = useCallback(
    (session: ChatSession): MenuItem => ({
      key: `session-${session.id}`,
      onClick: () => onActiveSessionMenuKeyChange(`session-${session.id}`),
      label: (
        <SessionMenuItem
          session={session}
          onUpdated={async () => {
            await loadSessionPage(1, false);
          }}
          onDeleted={handleDeleted}
        />
      ),
    }),
    [handleDeleted, loadSessionPage, onActiveSessionMenuKeyChange]
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    if (sessionListLoading && sessionItems.length === 0) {
      return [
        {
          key: 'recent-session',
          type: 'group',
          label: '聊天记录',
          children: [
            {
              key: 'session-loading',
              label: '会话加载中...',
              disabled: true,
            },
          ],
        },
      ];
    }

    const items: MenuItem[] = [];

    if (pinnedSessions.length > 0) {
      items.push({
        key: 'pinned-session',
        type: 'group',
        label: '置顶会话',
        children: pinnedSessions.map(createSessionItem),
      });
    }

    const normalChildren: MenuItem[] =
      normalSessions.length === 0
        ? [
            {
              key: 'empty-normal-session',
              label: '暂无会话',
              disabled: true,
            },
          ]
        : normalSessions.map(createSessionItem);

    if (hasMoreSessions || loadingMoreSessions) {
      normalChildren.push({
        key: 'session-load-more',
        disabled: true,
        label: (
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
        ),
      });
    }

    items.push({
      key: 'recent-session',
      type: 'group',
      label: '聊天记录',
      children: normalChildren,
    });

    return items;
  }, [
    createSessionItem,
    hasMoreSessions,
    loadingMoreSessions,
    normalSessions,
    pinnedSessions,
    sessionItems.length,
    sessionListLoading,
    sessionPage,
    loadSessionPage,
  ]);

  return {
    menuItems,
    refresh,
  };
};
