import { useSystemLayoutStore } from '@/layouts/_common/_store/useSystemLayoutStore';
import AppSidebar from '@/layouts/_common/Sidebar/AppSidebar';
import {
  clampSidebarWidth,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@/layouts/_common/Sidebar/sidebarLayoutConfig';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';
import AppNavigationControls from '@/layouts/AppNavigation/AppNavigationControls';
import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet } from 'react-router-dom';
import styles from './AppLayout.module.less';

const MAIN_MIN_WIDTH = 360;

function AppLayout() {
  const appNavigation = useAppNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const storedSidebarWidth = useSystemLayoutStore((state) => state.appSidebarWidth);
  const setSidebarWidth = useSystemLayoutStore((state) => state.setAppSidebarWidth);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingSidebarWidthRef = useRef<number | null>(null);
  const sidebarWidth = clampSidebarWidth(storedSidebarWidth);
  const sidebarPanelSize = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  useResizablePanelSize({
    panelRef: sidebarPanelRef,
    size: sidebarPanelSize,
  });

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      if (!collapsed) {
        const currentWidth = sidebarPanelRef.current?.getSize().inPixels;
        if (currentWidth != null) {
          const nextSidebarWidth = clampSidebarWidth(currentWidth);
          if (nextSidebarWidth > SIDEBAR_MIN_WIDTH || sidebarWidth === SIDEBAR_MIN_WIDTH) {
            setSidebarWidth(nextSidebarWidth);
          }
        }
      }
      return !collapsed;
    });
  }, [setSidebarWidth, sidebarWidth]);

  const handleSidebarResize = useCallback(
    (panelSize: PanelSize) => {
      if (sidebarCollapsed) return;
      pendingSidebarWidthRef.current = clampSidebarWidth(panelSize.inPixels);
    },
    [sidebarCollapsed]
  );

  const handleLayoutChanged = useCallback(
    (_layout: Layout, meta: LayoutChangedMeta) => {
      const pendingSidebarWidth = pendingSidebarWidthRef.current;
      pendingSidebarWidthRef.current = null;
      if (sidebarCollapsed || !meta.isUserInteraction || pendingSidebarWidth == null) return;
      setSidebarWidth(pendingSidebarWidth);
    },
    [setSidebarWidth, sidebarCollapsed]
  );

  return (
    <div className={styles.root}>
      {sidebarCollapsed ? (
        <div className={styles.collapsedHeaderControls}>
          <AppNavigationControls
            sidebarCollapsed
            canGoBack={appNavigation.canGoBack}
            canGoForward={appNavigation.canGoForward}
            onGoBack={appNavigation.goBack}
            onGoForward={appNavigation.goForward}
            onToggleSidebar={handleSidebarToggle}
          />
        </div>
      ) : null}

      <SystemResizablePanelGroup
        orientation="horizontal"
        className={styles.panelGroup}
        onLayoutChanged={handleLayoutChanged}
      >
        <SystemResizablePanel
          id="app-sidebar"
          panelRef={sidebarPanelRef}
          defaultSize={sidebarPanelSize}
          minSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH}
          maxSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH}
          groupResizeBehavior="preserve-pixel-size"
          className={styles.leftSider}
          aria-label="应用侧边栏"
          aria-hidden={sidebarCollapsed ? true : undefined}
          onResize={handleSidebarResize}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            canGoBack={appNavigation.canGoBack}
            canGoForward={appNavigation.canGoForward}
            onGoBack={appNavigation.goBack}
            onGoForward={appNavigation.goForward}
            onToggle={handleSidebarToggle}
          />
        </SystemResizablePanel>

        <SystemResizableHandle
          className={clsx(styles.resizeHandle, sidebarCollapsed && styles.resizeHandleCollapsed)}
          disabled={sidebarCollapsed}
        />

        <SystemResizablePanel
          id="app-main"
          minSize={MAIN_MIN_WIDTH}
          className={styles.middleLayout}
        >
          <main className={styles.middleContent}>
            <Outlet />
          </main>
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </div>
  );
}

export default AppLayout;
