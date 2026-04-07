import React, { useCallback, useMemo } from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  RiIndentDecrease,
  RiIndentIncrease,
  RiAddCircleFill,
  RiFileTextLine,
  RiGroupFill,
  RiPenNibFill,
  RiCloseLine,
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

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recentItems = useRecentFilesStore((s) => s.items);
  const removeRecentFile = useRecentFilesStore((s) => s.removeFile);
  const clickFile = useClickFile();
  const messageApi = useAppMessage();

  const handleOpenFile = useCallback(
    (resourceId: string) => {
      const found = recentItems.find((i) => i.resourceId === resourceId);
      if (found) {
        clickFile({
          resourceId: found.resourceId,
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
    const pathname = location.pathname;
    const baseSelectedKeys = [pathname];
    const resourceId = getOpenedResourceIdFromPath(pathname);
    if (resourceId == null) return baseSelectedKeys;

    const existsInSidebar = recentItems.some((item) => item.resourceId === resourceId);
    if (!existsInSidebar) return baseSelectedKeys;

    return [`opened-file-${resourceId}`];
  }, [location.pathname, recentItems]);

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
    const baseItems: SidebarMenuItem[] = [
      {
        key: 'new-chat',
        icon: <RiAddCircleFill size={18} />,
        label: '新聊天',
      },
      {
        key: '/app/drive',
        icon: <RiFileTextLine size={18} />,
        label: '文档与云盘',
        onClick: () => navigate('/app/drive'),
      },
      {
        key: '/app/my-group',
        icon: <RiGroupFill size={18} />,
        label: '我的小组',
        onClick: () => navigate('/app/my-group'),
      },
    ];

    // 构造聊天记录列表
    if (!collapsed) {
      const sessionHistoryChildren: SidebarMenuItem[] = [
        // 待接入真实记录
        {
          key: 'empty-session',
          label: '暂无会话',
          disabled: true,
        },
      ];
      baseItems.push({
        type: 'group',
        label: '聊天记录',
        key: 'recent-session',
        children: sessionHistoryChildren,
      });

      // 构造最近文件列表
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
    }

    return baseItems;
  }, [collapsed, recentItems, handleOpenFile, handleCloseRecentFile, navigate]);

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
