import React, { useState } from 'react';
import { useMount } from 'ahooks';
import { Avatar, Dropdown, Input, Modal } from 'antd';
import type { MenuProps } from 'antd';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useUserService } from '@/contexts/ServicesContext';
import type { User } from '@/types/user';
import { getIdentityTypeLabel } from '@/constants/user';
import { useAppMessage } from '@/hooks/useAppMessage';

import {
  RiArrowDownSLine,
  RiBankCardLine,
  RiPieChartLine,
  RiShieldUserLine,
  RiFeedbackLine,
  RiTranslate2,
  RiSunLine,
  RiLogoutBoxRLine,
} from 'react-icons/ri';

import styles from './style.module.less';
import { useAuthService } from '@/contexts/ServicesContext';
interface UserProfileProps {
  collapsed: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const userService = useUserService();
  const messageApi = useAppMessage();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const authService = useAuthService();

  useMount(() => {
    void userService.getUserInfo().then(setUser);
  });

  const displayName = user?.nickname || user?.username || '-';
  const identityLabel =
    user?.identityType !== undefined ? getIdentityTypeLabel(user.identityType) : '-';

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
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
      //   console.log('打开语言设置');
      //   break;
      // case 'theme':
      //   console.log('打开主题设置');
      //   break;
      case 'logout':
        authService.logout();
        navigate('/login', { replace: true });
        break;
      default:
        break;
    }
  };

  const items: MenuProps['items'] = [
    // --- 第一组：订阅与财务 ---
    // {
    //   key: 'subscription',
    //   label: '订阅信息',
    //   icon: <RiBankCardLine size={16} />,
    // },
    {
      key: 'usage',
      label: '余额与使用量',
      icon: <RiPieChartLine size={16} />,
    },
    { type: 'divider' },

    // --- 第二组：账号与反馈 ---
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

    // --- 第三组：设置 (带右侧文字) ---
    // {
    //   key: 'language',
    //   label: '语言',
    //   icon: <RiTranslate2 size={16} />,
    //   extra: <span style={{ fontSize: 12, color: '#999' }}>简体中文</span>,
    // },
    // {
    //   key: 'theme',
    //   label: '外观',
    //   icon: <RiSunLine size={16} />,
    //   extra: <span style={{ fontSize: 12, color: '#999' }}>浅色</span>,
    // },
    // { type: 'divider' },

    // --- 第四组：退出 ---
    {
      key: 'logout',
      label: '退出登录',
      icon: <RiLogoutBoxRLine size={16} />,
    },
  ];

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

  const handleSubmitFeedback = () => {
    const content = feedbackText.trim();
    if (content.length === 0) {
      messageApi.warning('请先填写反馈内容');
      return;
    }

    // TODO: 向服务器发送反馈信息
    messageApi.success('反馈已提交，感谢你的建议');
    setFeedbackModalOpen(false);
    setFeedbackText('');
  };

  const handleCancelFeedback = () => {
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
        title="用户反馈"
        open={feedbackModalOpen}
        onOk={handleSubmitFeedback}
        onCancel={handleCancelFeedback}
        okText="提交"
        cancelText="取消"
      >
        <Input.TextArea
          value={feedbackText}
          onChange={(event) => setFeedbackText(event.target.value)}
          placeholder="请输入你的反馈内容，我们会认真阅读。"
          autoSize={{ minRows: 8, maxRows: 16 }}
          maxLength={2000}
          showCount
          className={styles.feedbackInput}
        />
      </Modal>
    </>
  );
};

export default UserProfile;
