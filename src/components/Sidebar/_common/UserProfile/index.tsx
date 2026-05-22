import { useUserService } from '@/domains';
import type { User } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { useMount } from 'ahooks';
import type { MenuProps } from 'antd';
import { Avatar, Button, Dropdown, Modal } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  RiArrowDownSLine,
  RiFeedbackLine,
  RiHomeLine,
  RiLogoutBoxRLine,
  RiPieChartLine,
  RiShieldKeyholeLine,
  RiShieldUserLine,
} from 'react-icons/ri';

import { useAuthService } from '@/domains';
import styles from './style.module.less';

/** 问卷星问题反馈页（内嵌 iframe） */
const FEEDBACK_SURVEY_URL = 'https://v.wjx.cn/vm/PrUZetY.aspx';

interface UserProfileProps {
  collapsed: boolean;
  menuMode?: 'app' | 'admin';
}

function UserProfile({ collapsed, menuMode = 'app' }: UserProfileProps) {
  const navigate = useNavigate();
  const userService = useUserService();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const authService = useAuthService();

  useMount(() => {
    void userService.getUserInfo().then(setUser);
  });

  const displayName = user?.nickname || user?.username || '-';
  const identityLabel =
    user?.identityType !== undefined ? IDENTITY.getLabel(user.identityType) : '-';
  const isAdmin = user?.identityType === IDENTITY.ADMIN;

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'enter-admin':
        navigate('/admin/users');
        break;
      case 'back-app':
        navigate('/app');
        break;
      case 'subscription':
        navigate('/app/profile/subscription');
        break;
      case 'usage':
        navigate('/app/profile/usage');
        break;
      case 'account':
        navigate('/app/profile/account');
        break;
      case 'feedback':
        setFeedbackModalOpen(true);
        break;
      // case 'language':
      //   break;
      // case 'theme':
      //   break;
      case 'logout':
        authService.logout();
        navigate('/login', { replace: true });
        break;
      default:
        break;
    }
  };

  const appMenuItems: MenuProps['items'] = [
    {
      key: 'usage',
      label: '余额与使用量',
      icon: <RiPieChartLine size={16} />,
    },
    { type: 'divider' },
    {
      key: 'account',
      label: '账号',
      icon: <RiShieldUserLine size={16} />,
    },
    {
      key: 'feedback',
      label: '用户反馈',
      icon: <RiFeedbackLine size={16} />,
    },
    { type: 'divider' },
    ...(isAdmin
      ? ([
          {
            key: 'enter-admin',
            label: '进入管理',
            icon: <RiShieldKeyholeLine size={16} />,
          },
        ] satisfies MenuProps['items'])
      : []),
    {
      key: 'logout',
      label: '退出登录',
      icon: <RiLogoutBoxRLine size={16} />,
    },
  ];

  const adminMenuItems: MenuProps['items'] = [
    {
      key: 'back-app',
      label: '回到用户端',
      icon: <RiHomeLine size={16} />,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <RiLogoutBoxRLine size={16} />,
    },
  ];

  const items = menuMode === 'admin' ? adminMenuItems : appMenuItems;

  // 下拉菜单配置
  const dropdownProps = {
    menu: {
      items,
      onClick: handleMenuClick,
      style: { minWidth: 240 },
    },
    trigger: ['click'] as ('click' | 'hover' | 'contextMenu')[],
    placement: 'topLeft' as const,
  };

  const handleCloseFeedback = () => {
    setFeedbackModalOpen(false);
  };

  return (
    <>
      <Dropdown {...dropdownProps}>
        <div className={clsx(styles.profile, !collapsed && styles.expanded)}>
          <Avatar size="small" className={styles.avatar} src={user?.avatar} alt={displayName}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          {!collapsed && (
            <>
              <div className={styles.info}>
                <span className={styles.username}>{displayName}</span>
                <span className={styles.tag}>{identityLabel}</span>
              </div>
              <RiArrowDownSLine className={styles.icon} />
            </>
          )}
        </div>
      </Dropdown>

      <Modal
        title="问题反馈"
        open={feedbackModalOpen}
        onCancel={handleCloseFeedback}
        width={880}
        destroyOnHidden
        footer={
          <Button type="primary" onClick={handleCloseFeedback}>
            关闭
          </Button>
        }
      >
        <div className={styles.feedbackIframeWrap}>
          <iframe
            className={styles.feedbackIframe}
            title="问卷星问题反馈"
            src={FEEDBACK_SURVEY_URL}
            allowFullScreen
          />
        </div>
        <p className={styles.feedbackFallback}>
          若页面无法显示，请
          <a
            className={styles.feedbackFallbackLink}
            href={FEEDBACK_SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            在新窗口打开问卷
          </a>
          。
        </p>
      </Modal>
    </>
  );
}

export default UserProfile;
