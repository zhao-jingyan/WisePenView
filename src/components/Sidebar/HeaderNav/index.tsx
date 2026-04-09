import React from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useRequest } from 'ahooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiAddCircleFill, RiFileTextLine, RiGroupFill } from 'react-icons/ri';
import { useChatService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { HeaderNavProps } from './index.type';
import styles from './style.module.less';

const HeaderNav: React.FC<HeaderNavProps> = ({ collapsed, onSessionCreated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const chatService = useChatService();
  const messageApi = useAppMessage();

  const isDriveActive = location.pathname.startsWith('/app/drive');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const selectedKeys = isDriveActive ? ['/app/drive'] : isGroupActive ? ['/app/my-group'] : [];
  const { run: runCreateSession, loading: createSessionLoading } = useRequest(
    async () => chatService.createSession(),
    {
      manual: true,
      onSuccess: (session) => {
        messageApi.success('新建聊天成功');
        onSessionCreated(session.id);
      },
      onError: (err) => {
        messageApi.error(parseErrorMessage(err, '新建聊天失败'));
      },
    }
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'new-chat',
      icon: <RiAddCircleFill size={18} />,
      onClick: () => runCreateSession(),
      disabled: createSessionLoading,
      label: '新聊天',
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
