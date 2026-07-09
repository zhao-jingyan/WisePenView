import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/_shadcn';
import AppSidebar from '@/layouts/_common/Sidebar/AppSidebar';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useCallback, useRef, useState } from 'react';
import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels';
import { Outlet } from 'react-router-dom';
import styles from './AppLayout.module.less';

const SIDEBAR_WIDTH = 308;
const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const MAIN_MIN_WIDTH = 360;

const clampSidebarWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const sidebarPanelSize = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  useResizablePanelSize({
    panelRef: sidebarPanelRef,
    size: sidebarPanelSize,
  });

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const handleSidebarResize = useCallback(
    (panelSize: PanelSize) => {
      if (sidebarCollapsed) return;
      setSidebarWidth(clampSidebarWidth(panelSize.inPixels));
    },
    [sidebarCollapsed]
  );

  return (
    <ResizablePanelGroup orientation="horizontal" className={styles.root}>
      <ResizablePanel
        id="app-sidebar"
        panelRef={sidebarPanelRef}
        defaultSize={sidebarPanelSize}
        minSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MIN_WIDTH}
        maxSize={sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_MAX_WIDTH}
        disabled={sidebarCollapsed}
        className={styles.leftSider}
        aria-label="应用侧边栏"
        onResize={handleSidebarResize}
      >
        <AppSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      </ResizablePanel>

      {!sidebarCollapsed ? <ResizableHandle className={styles.resizeHandle} /> : null}

      <ResizablePanel id="app-main" minSize={MAIN_MIN_WIDTH} className={styles.middleLayout}>
        <main className={styles.middleContent}>
          <Outlet />
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default AppLayout;
