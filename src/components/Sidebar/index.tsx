import React, { useCallback, useMemo, useState } from 'react';
import { Button, Input, Menu, Modal } from 'antd';
import { useMount, useRequest } from 'ahooks';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  RiIndentDecrease,
  RiIndentIncrease,
  RiAddCircleFill,
  RiFileTextLine,
  RiGroupFill,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
} from 'react-icons/ri';

import FileTypeIcon from '@/components/Common/FileTypeIcon';
import styles from './style.module.less';
import logoImg from '@/assets/images/logo-icon.png';

import UserProfile from '@/components/UserProfile';
import { useRecentFilesStore } from '@/store';
import { useClickFile } from '@/hooks/drive';
import { useAppMessage } from '@/hooks/useAppMessage';
import { type SidebarProps, type SidebarMenuItem } from './index.type';
import { getOpenedResourceIdFromPath } from '@/utils/openedResourceRoute';
import { useChatService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { ChatSession } from '@/services/Chat';

const SESSION_PAGE_SIZE = 20;

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recentItems = useRecentFilesStore((s) => s.items);
  const removeRecentFile = useRecentFilesStore((s) => s.removeFile);
  const clickFile = useClickFile();
  const messageApi = useAppMessage();
  const chatService = useChatService();
  const [activeSessionMenuKey, setActiveSessionMenuKey] = useState<string>();
  const [sessionItems, setSessionItems] = useState<ChatSession[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPage, setSessionTotalPage] = useState(1);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
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

  useMount(() => {
    void loadSessionPage(1, false);
  });

  const { runAsync: runCreateSession, loading: createSessionLoading } = useRequest(
    async () => chatService.createSession(),
    {
      manual: true,
      onSuccess: async (createdSession) => {
        messageApi.success('新建聊天成功');
        setActiveSessionMenuKey(`session-${createdSession.id}`);
        await loadSessionPage(1, false);
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '新建聊天失败'));
      },
    }
  );

  const { runAsync: runRenameSession } = useRequest(
    async (sessionId: string, newTitle: string) =>
      chatService.renameSession({
        sessionId,
        newTitle,
      }),
    {
      manual: true,
      onSuccess: async () => {
        messageApi.success('重命名成功');
        setEditingSessionId(null);
        setEditingTitle('');
        await loadSessionPage(1, false);
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '重命名会话失败'));
      },
    }
  );

  const { runAsync: runDeleteSession, loading: deleteSessionLoading } = useRequest(
    async (sessionId: string) =>
      chatService.deleteSession({
        sessionId,
      }),
    {
      manual: true,
      onSuccess: async (_, params) => {
        const targetSessionId = params[0];
        messageApi.success('删除成功');
        if (activeSessionMenuKey === `session-${targetSessionId}`) {
          setActiveSessionMenuKey(undefined);
        }
        await loadSessionPage(1, false);
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '删除会话失败'));
      },
    }
  );

  const handleOpenFile = useCallback(
    (resourceId: string) => {
      const found = recentItems.find((i) => i.resourceId === resourceId);
      if (found) {
        setActiveSessionMenuKey(undefined);
        clickFile({
          resourceId: found.resourceId,
          ownerInfo: found.ownerInfo,
          resourceName: found.resourceName,
          resourceType: found.resourceType,
        });
      } else {
        messageApi.warning('文件不存在或已失效');
      }
    },
    [clickFile, recentItems, messageApi]
  );

  const selectedKeys = useMemo(() => {
    if (activeSessionMenuKey) {
      return [activeSessionMenuKey];
    }

    const pathname = location.pathname;
    const baseSelectedKeys = [pathname];
    const resourceId = getOpenedResourceIdFromPath(pathname);
    if (resourceId == null) return baseSelectedKeys;

    const existsInSidebar = recentItems.some((item) => item.resourceId === resourceId);
    if (!existsInSidebar) return baseSelectedKeys;

    return [`opened-file-${resourceId}`];
  }, [activeSessionMenuKey, location.pathname, recentItems]);

  const handleCloseRecentFile = useCallback(
    (resourceId: string) => {
      // 当前正在打开的资源ID（取自 pathname）
      const currentId = getOpenedResourceIdFromPath(location.pathname);
      // 移除最近文件列表中的此文件
      removeRecentFile(resourceId);
      // 如果当前正打开的是此文件，则跳转回文件列表页
      if (currentId === resourceId) {
        navigate('/app/drive');
      }
    },
    [location.pathname, navigate, removeRecentFile]
  );

  const menuItems = useMemo(() => {
    const pinnedSessions = sessionItems.filter((item) => item.is_pinned);
    const normalSessions = sessionItems.filter((item) => !item.is_pinned);

    const buildSessionMenuChildren = (
      sessions: ChatSession[],
      emptyKey: string
    ): SidebarMenuItem[] => {
      if (sessions.length === 0) {
        return [
          {
            key: emptyKey,
            label: '暂无会话',
            disabled: true,
          },
        ];
      }

      return sessions.map((session) => ({
        key: `session-${session.id}`,
        label: (
          <div
            className={clsx(
              styles.sessionMenuLabel,
              editingSessionId === session.id && styles.sessionMenuLabelEditing
            )}
          >
            {editingSessionId === session.id ? (
              <Input
                size="small"
                value={editingTitle}
                className={styles.sessionInlineInput}
                placeholder="请输入会话名称"
                autoFocus
                onChange={(event) => setEditingTitle(event.target.value)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onPressEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const trimmedTitle = editingTitle.trim();
                  if (!trimmedTitle) {
                    messageApi.warning('请输入会话名称');
                    return;
                  }
                  void runRenameSession(session.id, trimmedTitle);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setEditingSessionId(null);
                    setEditingTitle('');
                  }
                }}
              />
            ) : (
              <span className={styles.sessionMenuLabelText}>{session.title || '未命名会话'}</span>
            )}
            <div className={styles.sessionActions}>
              {editingSessionId === session.id ? (
                <>
                  <button
                    type="button"
                    className={styles.sessionActionBtn}
                    aria-label="确认重命名"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const trimmedTitle = editingTitle.trim();
                      if (!trimmedTitle) {
                        messageApi.warning('请输入会话名称');
                        return;
                      }
                      void runRenameSession(session.id, trimmedTitle);
                    }}
                  >
                    <RiCheckLine size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.sessionActionBtn}
                    aria-label="取消重命名"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEditingSessionId(null);
                      setEditingTitle('');
                    }}
                  >
                    <RiCloseLine size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.sessionActionBtn}
                    aria-label={`重命名 ${session.title || '未命名会话'}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEditingSessionId(session.id);
                      setEditingTitle(session.title || '');
                    }}
                  >
                    <RiEditLine size={16} />
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.sessionActionBtn, styles.sessionDeleteBtn)}
                    aria-label={`删除 ${session.title || '未命名会话'}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      Modal.confirm({
                        title: '删除会话',
                        content: '删除后不可恢复，是否继续？',
                        okText: '删除',
                        okButtonProps: {
                          danger: true,
                          loading: deleteSessionLoading,
                        },
                        cancelText: '取消',
                        onOk: async () => {
                          await runDeleteSession(session.id);
                        },
                      });
                    }}
                  >
                    <RiDeleteBinLine size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ),
        onClick: () => setActiveSessionMenuKey(`session-${session.id}`),
      }));
    };

    const baseItems: SidebarMenuItem[] = [
      {
        key: 'new-chat',
        icon: <RiAddCircleFill size={18} />,
        label: '新聊天',
        onClick: () => {
          setActiveSessionMenuKey(undefined);
          void runCreateSession();
        },
        disabled: createSessionLoading,
      },
      {
        key: '/app/drive',
        icon: <RiFileTextLine size={18} />,
        label: '文档与云盘',
        onClick: () => {
          setActiveSessionMenuKey(undefined);
          navigate('/app/drive');
        },
      },
      {
        key: '/app/my-group',
        icon: <RiGroupFill size={18} />,
        label: '我的小组',
        onClick: () => {
          setActiveSessionMenuKey(undefined);
          navigate('/app/my-group');
        },
      },
    ];

    if (!collapsed) {
      const recentFileChildren: SidebarMenuItem[] =
        recentItems.length > 0
          ? recentItems.map((item) => ({
              key: `opened-file-${item.resourceId}`,
              icon: <FileTypeIcon resourceType={item.resourceType} size={16} />,
              label: (
                <div className={styles.fileMenuLabel}>
                  <span className={styles.fileMenuLabelText}>{item.resourceName || '未命名'}</span>
                  <button
                    type="button"
                    className={styles.fileCloseBtn}
                    aria-label={`关闭 ${item.resourceName || '未命名'}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleCloseRecentFile(item.resourceId);
                    }}
                  >
                    <RiCloseLine size={14} />
                  </button>
                </div>
              ),
              onClick: () => handleOpenFile(item.resourceId),
            }))
          : [
              {
                key: 'empty-file',
                label: '暂无打开的文件',
                disabled: true,
              },
            ];

      baseItems.push({
        type: 'group',
        label: '打开的文件',
        key: 'opened-file',
        children: recentFileChildren,
      });

      const sessionHistoryChildren: SidebarMenuItem[] = buildSessionMenuChildren(
        normalSessions,
        'empty-normal-session'
      );

      const hasMoreSessions = sessionPage < sessionTotalPage;
      if (hasMoreSessions || loadingMoreSessions) {
        sessionHistoryChildren.push({
          key: 'session-load-more',
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
          disabled: true,
        });
      }

      if (sessionListLoading && sessionItems.length === 0) {
        sessionHistoryChildren.splice(0, sessionHistoryChildren.length, {
          key: 'session-loading',
          label: '会话加载中...',
          disabled: true,
        });
      }

      if (pinnedSessions.length > 0) {
        baseItems.push({
          type: 'group',
          label: '置顶会话',
          key: 'pinned-session',
          children: buildSessionMenuChildren(pinnedSessions, 'empty-pinned-session'),
        });
      }

      baseItems.push({
        type: 'group',
        label: '聊天记录',
        key: 'recent-session',
        children: sessionHistoryChildren,
      });
    }

    return baseItems;
  }, [
    collapsed,
    createSessionLoading,
    deleteSessionLoading,
    editingSessionId,
    editingTitle,
    handleCloseRecentFile,
    handleOpenFile,
    loadSessionPage,
    loadingMoreSessions,
    messageApi,
    navigate,
    recentItems,
    runCreateSession,
    runDeleteSession,
    runRenameSession,
    sessionItems,
    sessionListLoading,
    sessionPage,
    sessionTotalPage,
  ]);

  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      {/* Header */}
      <div className={clsx(styles.header, collapsed && styles.collapsedHeader)}>
        <div onClick={onToggle} className={styles.triggerBtn}>
          {collapsed ? <RiIndentIncrease /> : <RiIndentDecrease />}
        </div>

        {!collapsed && (
          <>
            <div className={styles.logoIcon}>
              <img src={logoImg} alt="WisePen" />
            </div>
            <span className={styles.logoText}>WisePen</span>
          </>
        )}
      </div>

      {/* Menu */}
      <div className={styles.menuContainer}>
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={selectedKeys}
          inlineCollapsed={collapsed}
          items={menuItems}
        />
      </div>

      {/* Footer */}
      <UserProfile collapsed={collapsed} />
    </div>
  );
};

export default Sidebar;
