import ChatPanel from '@/components/ChatPanel';
import ChatSessionBar from '@/components/ChatPanel/ChatSessionBar';
import type { ChatSession } from '@/domains/Chat';
import DriveSidebar from '@/layouts/_common/Sidebar/DriveSidebar';
import { useChatPanelResize } from '@/layouts/_common/useChatPanelResize';
import { clearNewChatSessionStore, useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import {
  normalizeWorkspaceResourceType,
  resolveLegacyEditorTypeForWorkspace,
  resolveWorkspaceViewer,
} from '@/utils/navigation/workspaceRoute';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import WorkspaceFrame from './_common/WorkspaceFrame';
import WorkspaceHeader from './_common/WorkspaceHeader';
import styles from './WorkspaceLayout.module.less';
import type { WorkspaceLayoutConfig, WorkspaceOutletContextValue } from './WorkspaceOutletContext';

function WorkspaceLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutConfig, setLayoutConfigState] = useState<WorkspaceLayoutConfig>({});
  const [chatSessionBarOpen, setChatSessionBarOpen] = useState(false);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const hasSessionId = Boolean(currentSessionId);
  const shouldRenderChatPanel = hasSessionId || chatPanelDraftOpen;
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;
  const location = useLocation();
  const resourceRouteMatch = useMatch('/app/workspace/:resourceType/:resourceId');
  const resourceListRouteMatch = useMatch('/app/workspace/:resourceType');
  const { rootRef, chatResizeGuideRef, chatPanelWidth, chatResizing, onResizeStart } =
    useChatPanelResize();
  const routeContext = useMemo(() => {
    const rawResourceType =
      resourceRouteMatch?.params.resourceType ?? resourceListRouteMatch?.params.resourceType;
    const resourceId = resourceRouteMatch?.params.resourceId;
    const resourceType = normalizeWorkspaceResourceType(rawResourceType);
    const viewer = resolveWorkspaceViewer({
      resourceType: rawResourceType,
      viewer: new URLSearchParams(location.search).get('viewer') ?? undefined,
    });

    return {
      resourceId,
      resourceType,
      viewer,
    };
  }, [
    location.search,
    resourceListRouteMatch?.params.resourceType,
    resourceRouteMatch?.params.resourceId,
    resourceRouteMatch?.params.resourceType,
  ]);
  const routeChatContext = useMemo(() => {
    const { resourceId, resourceType, viewer } = routeContext;
    if (!resourceId || !resourceType) return undefined;
    return {
      resourceId,
      resourceType,
      viewer,
      editorType: resolveLegacyEditorTypeForWorkspace(resourceType, viewer),
    };
  }, [routeContext]);
  const chatWorkspaceContext = layoutConfig.chatContext ?? routeChatContext;

  useUpdateEffect(() => {
    if (shouldRenderChatPanel) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  useUpdateEffect(() => {
    if (!hasSessionId && !chatPanelDraftOpen) return;
    if (hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [chatPanelDraftOpen, hasSessionId, setChatPanelDraftOpen]);

  useUpdateEffect(() => {
    if (!safeChatPanelCollapsed) return;
    setChatSessionBarOpen(false);
  }, [safeChatPanelCollapsed]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const handleChatPanelToggle = useCallback(() => {
    if (safeChatPanelCollapsed) {
      if (!hasSessionId) {
        setChatPanelDraftOpen(true);
      }
      setChatPanelCollapsed(false);
      return;
    }

    setChatSessionBarOpen(false);
    setChatPanelCollapsed(true);
    if (!hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [hasSessionId, safeChatPanelCollapsed, setChatPanelCollapsed, setChatPanelDraftOpen]);

  const handleNewChat = useCallback(() => {
    setChatSessionBarOpen(false);
    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  }, [clearCurrentSession, setChatPanelCollapsed, setChatPanelDraftOpen]);

  const handleToggleChatSessionBar = useCallback(() => {
    if (safeChatPanelCollapsed) return;
    setChatSessionBarOpen((open) => !open);
  }, [safeChatPanelCollapsed]);

  const handleCloseChatSessionBar = useCallback(() => {
    setChatSessionBarOpen(false);
  }, []);

  const handleSelectChatSession = useCallback(
    (session: ChatSession) => {
      setCurrentSession({ id: session.id, title: session.title });
      clearNewChatSessionStore();
      setChatPanelDraftOpen(false);
      setChatPanelCollapsed(false);
      setChatSessionBarOpen(false);
    },
    [setChatPanelCollapsed, setChatPanelDraftOpen, setCurrentSession]
  );

  const setLayoutConfig = useCallback((config: WorkspaceLayoutConfig) => {
    setLayoutConfigState(config);
  }, []);

  const resetLayoutConfig = useCallback(() => {
    setLayoutConfigState({});
  }, []);

  const outletContext = useMemo<WorkspaceOutletContextValue>(
    () => ({
      routeContext,
      setLayoutConfig,
      resetLayoutConfig,
    }),
    [resetLayoutConfig, routeContext, setLayoutConfig]
  );

  const renderHeader = () => {
    if (layoutConfig.header === false) return null;

    return (
      <WorkspaceHeader
        {...(layoutConfig.header ?? {})}
        leftSidebarCollapsed={sidebarCollapsed}
        rightSidebarCollapsed={safeChatPanelCollapsed}
        onToggleLeftSidebar={handleSidebarToggle}
        onToggleRightSidebar={handleChatPanelToggle}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      <aside
        className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
        aria-label="资源侧边栏"
        aria-hidden={sidebarCollapsed ? true : undefined}
      >
        <DriveSidebar collapsed={sidebarCollapsed} />
      </aside>

      <div className={styles.middleLayout}>
        <main className={`${styles.middleContent} ${styles.workspaceContent}`}>
          <WorkspaceFrame
            className={layoutConfig.className}
            bodyClassName={layoutConfig.bodyClassName}
            header={renderHeader()}
          >
            <Outlet context={outletContext} />
          </WorkspaceFrame>
        </main>
      </div>

      <aside
        className={clsx(styles.rightSider, safeChatPanelCollapsed && styles.rightSiderCollapsed)}
        aria-label="聊天面板"
        aria-hidden={safeChatPanelCollapsed ? true : undefined}
      >
        {!safeChatPanelCollapsed && (
          <button
            type="button"
            className={`${styles.chatResizeHandle} ${chatResizing ? styles.chatResizeHandleActive : ''}`}
            onMouseDown={onResizeStart}
            aria-label="调整聊天面板宽度"
          />
        )}
        <div className={styles.rightSiderInner}>
          {shouldRenderChatPanel ? (
            <ChatPanel
              collapsed={safeChatPanelCollapsed}
              onNewChat={handleNewChat}
              sessionBarOpen={chatSessionBarOpen}
              onToggleSessionBar={handleToggleChatSessionBar}
              workspaceContext={chatWorkspaceContext}
              showCollapseButton={false}
            />
          ) : null}
        </div>
      </aside>
      {chatSessionBarOpen && !safeChatPanelCollapsed ? (
        <ChatSessionBar
          activeSessionId={currentSessionId}
          onClose={handleCloseChatSessionBar}
          onSelectSession={handleSelectChatSession}
        />
      ) : null}
    </div>
  );
}

export default WorkspaceLayout;
