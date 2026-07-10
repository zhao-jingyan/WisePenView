import AppSidebar from '@/layouts/_common/Sidebar/AppSidebar';
import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { useSystemLayoutStore } from '@/store';
import { Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';
import { Outlet } from 'react-router-dom';
import styles from './AppLayout.module.less';

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_COLLAPSED_WIDTH = 0;
const MAIN_MIN_WIDTH = 360;

const clampSidebarWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const storedSidebarWidth = useSystemLayoutStore((state) => state.appSidebarWidth);
  const setSidebarWidth = useSystemLayoutStore((state) => state.setAppSidebarWidth);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingSidebarWidthRef = useRef<number | null>(null);
  const sidebarWidth = clampSidebarWidth(storedSidebarWidth);
  const sidebarPanelSize = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
  const sidebarToggleLabel = sidebarCollapsed ? '展开侧边栏' : '收起侧边栏';

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
      <div className={styles.sidebarToggleHost}>
        <Tooltip>
          <Tooltip.Trigger>
            <button
              type="button"
              className={clsx(
                styles.sidebarToggle,
                sidebarCollapsed && styles.sidebarToggleCollapsed
              )}
              onClick={handleSidebarToggle}
              aria-label={sidebarToggleLabel}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} aria-hidden="true" />
              )}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content>{sidebarToggleLabel}</Tooltip.Content>
        </Tooltip>
      </div>

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
          className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
          aria-label="应用侧边栏"
          aria-hidden={sidebarCollapsed ? true : undefined}
          onResize={handleSidebarResize}
        >
          <AppSidebar collapsed={sidebarCollapsed} />
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
