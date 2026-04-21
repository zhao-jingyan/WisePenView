import React, { useCallback } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useRequest } from 'ahooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiAddCircleFill, RiFileTextLine, RiGroupFill, RiPenNibFill } from 'react-icons/ri';
import { useChatService, useNoteService, useUserService } from '@/contexts/ServicesContext';
import { RESOURCE_TYPE } from '@/constants/resource';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useNewChatSessionStore, useNewNoteStore, useRecentFilesStore } from '@/store';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { HeaderNavProps } from './index.type';
import styles from './style.module.less';

const HeaderNav: React.FC<HeaderNavProps> = ({ collapsed, onSessionCreated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const chatService = useChatService();
  const noteService = useNoteService();
  const userService = useUserService();
  const messageApi = useAppMessage();
  const addRecentFile = useRecentFilesStore((s) => s.addFile);

  const isDriveActive = location.pathname.startsWith('/app/drive');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const selectedKeys = isDriveActive ? ['/app/drive'] : isGroupActive ? ['/app/my-group'] : [];
  const { run: runCreateSession, loading: createSessionLoading } = useRequest(
    async () => chatService.createSession(),
    {
      manual: true,
      onSuccess: (session) => {
        useNewChatSessionStore.getState().setNewChatSession({
          id: session.id,
          title: session.title,
        });
        onSessionCreated(session.id, session.title);
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '新建对话失败'));
      },
    }
  );

  const handleCreateSession = useCallback(() => {
    if (createSessionLoading) return;
    const { newChatSessionId, newChatSessionTitle } = useNewChatSessionStore.getState();
    if (newChatSessionId != null && newChatSessionId !== '') {
      onSessionCreated(newChatSessionId, newChatSessionTitle);
      return;
    }
    runCreateSession();
  }, [createSessionLoading, onSessionCreated, runCreateSession]);

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw new Error('创建笔记失败：未获取到资源ID');
      }
      const currentUser = await userService.getUserInfo();
      return {
        resourceId,
        ownerInfo: currentUser,
      };
    },
    {
      manual: true,
      onSuccess: ({ resourceId, ownerInfo }) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        addRecentFile({
          resourceId,
          resourceName: '未命名笔记',
          ownerInfo,
          resourceType: RESOURCE_TYPE.NOTE,
        });
        navigate(`/app/note/${encodeURIComponent(resourceId)}`);
      },
      onError: () => {
        messageApi.error('创建笔记失败，请稍后重试');
      },
    }
  );

  const handleCreateNote = useCallback(() => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId != null && pendingNewNoteId !== '') {
      navigate(`/app/note/${encodeURIComponent(pendingNewNoteId)}`);
      return;
    }
    runCreateNote();
  }, [creatingNote, navigate, runCreateNote]);

  const menuItems: MenuProps['items'] = [
    {
      key: 'new-chat',
      icon: <RiAddCircleFill size={18} />,
      onClick: () => handleCreateSession(),
      disabled: createSessionLoading,
      label: '新建对话',
    },
    {
      key: 'new-note',
      icon: <RiPenNibFill size={18} />,
      onClick: () => handleCreateNote(),
      disabled: creatingNote,
      label: '新建笔记',
    },
    {
      key: '/app/drive',
      icon: <RiFileTextLine size={18} />,
      onClick: () => navigate('/app/drive'),
      label: '文档与云盘',
    },
    {
      key: '/app/my-group',
      icon: <RiGroupFill size={18} />,
      onClick: () => navigate('/app/my-group'),
      label: '我的小组',
    },
  ];

  return (
    <Menu
      mode="inline"
      theme="light"
      className={styles.headerMenu}
      selectedKeys={selectedKeys}
      inlineCollapsed={collapsed}
      items={menuItems}
    />
  );
};

export default HeaderNav;
