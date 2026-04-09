import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useUpdateEffect } from 'ahooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClickFile } from '@/hooks/drive';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useRecentFilesStore } from '@/store';
import { getOpenedResourceIdFromPath } from '@/utils/openedResourceRoute';
import { buildRecentFilesGroupItems } from '../RecentFilesGroup';
import { useSessionListGroup } from '../SessionListGroup';
import type { SidebarMenuProps, SidebarMenuRef } from './index.type';
import styles from './style.module.less';

const SidebarMenu = forwardRef<SidebarMenuRef, SidebarMenuProps>(({ collapsed }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const recentItems = useRecentFilesStore((s) => s.items);
  const removeRecentFile = useRecentFilesStore((s) => s.removeFile);
  const clickFile = useClickFile();
  const messageApi = useAppMessage();
  const [activeSessionMenuKey, setActiveSessionMenuKey] = useState<string>();
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string>();

  const { menuItems: sessionMenuItems, refresh } = useSessionListGroup({
    activeSessionMenuKey,
    onActiveSessionMenuKeyChange: setActiveSessionMenuKey,
  });

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
    [clickFile, messageApi, recentItems]
  );

  const handleCloseRecentFile = useCallback(
    (resourceId: string) => {
      const currentId = getOpenedResourceIdFromPath(location.pathname);
      removeRecentFile(resourceId);
      if (currentId === resourceId) {
        navigate('/app/drive');
      }
    },
    [location.pathname, navigate, removeRecentFile]
  );

  const menuItems = useMemo<Required<MenuProps>['items']>(() => {
    if (collapsed) {
      return [];
    }
    return [
      ...buildRecentFilesGroupItems({
        items: recentItems,
        onOpenFile: handleOpenFile,
        onCloseFile: handleCloseRecentFile,
      }),
      ...sessionMenuItems,
    ];
  }, [collapsed, handleCloseRecentFile, handleOpenFile, recentItems, sessionMenuItems]);

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string) => {
        setActiveSessionMenuKey(`session-${sessionId}`);
        if (collapsed) {
          setPendingCreatedSessionId(sessionId);
          return;
        }
        await refresh();
      },
    }),
    [collapsed, refresh]
  );

  useUpdateEffect(() => {
    if (collapsed || pendingCreatedSessionId == null) return;
    void refresh();
    setPendingCreatedSessionId(undefined);
  }, [collapsed, pendingCreatedSessionId, refresh]);

  return (
    <div className={styles.menuContainer}>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={selectedKeys}
        inlineCollapsed={collapsed}
        items={menuItems}
      />
    </div>
  );
});

SidebarMenu.displayName = 'SidebarMenu';

export type { SidebarMenuRef };
export default SidebarMenu;
