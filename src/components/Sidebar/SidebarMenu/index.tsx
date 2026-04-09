import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClickFile } from '@/hooks/drive';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useRecentFilesStore } from '@/store';
import { getOpenedResourceIdFromPath } from '@/utils/openedResourceRoute';
import RecentFilesGroup from '../RecentFilesGroup';
import SessionSection from '../SessionSection';
import type { SessionSectionRef } from '../SessionSection/index.type';
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
  const sessionSectionRef = useRef<SessionSectionRef>(null);

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

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string) => {
        await sessionSectionRef.current?.handleCreatedSession(sessionId);
      },
    }),
    []
  );

  return (
    <div className={styles.menuContainer}>
      <Menu mode="inline" theme="light" selectedKeys={selectedKeys} inlineCollapsed={collapsed}>
        {!collapsed && (
          <>
            <RecentFilesGroup
              items={recentItems}
              onOpenFile={handleOpenFile}
              onCloseFile={handleCloseRecentFile}
            />
            <SessionSection
              ref={sessionSectionRef}
              activeSessionMenuKey={activeSessionMenuKey}
              onActiveSessionMenuKeyChange={setActiveSessionMenuKey}
            />
          </>
        )}
      </Menu>
    </div>
  );
});

SidebarMenu.displayName = 'SidebarMenu';

export type { SidebarMenuRef };
export default SidebarMenu;
