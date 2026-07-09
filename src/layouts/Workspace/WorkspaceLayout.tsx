import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/_shadcn';
import ChatPanel from '@/components/ChatPanel';
import ChatSessionBar from '@/components/ChatPanel/ChatSessionBar';
import type { ChatSession } from '@/domains/Chat';
import DriveSidebar from '@/layouts/_common/Sidebar/DriveSidebar';
import { useResizablePanelSize } from '@/layouts/_common/useResizablePanelSize';
import { clearNewChatSessionStore, useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import {
  normalizeWorkspaceResourceType,
  resolveLegacyEditorTypeForWorkspace,
  resolveWorkspaceViewer,
} from '@/utils/navigation/workspaceRoute';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import WorkspaceFrame from './_common/WorkspaceFrame';
import WorkspaceHeader from './_common/WorkspaceHeader';
import styles from './WorkspaceLayout.module.less';
import type { WorkspaceLayoutConfig, WorkspaceOutletContextValue } from './WorkspaceOutletContext';

const WORKSPACE_LEFT_SIDEBAR_WIDTH = 308;
const WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH = 240;
const WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH = 420;
const WORKSPACE_MAIN_MIN_WIDTH = 360;
const CHAT_PANEL_MIN_WIDTH = 320;
const CHAT_PANEL_MAX_WIDTH = 1020;
const CHAT_SESSION_PANEL_WIDTH = 320;
const CHAT_SESSION_PANEL_MIN_WIDTH = 240;
const CHAT_SESSION_PANEL_MAX_WIDTH = 420;

const clampPanelWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(width), min), max);

function WorkspaceLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(WORKSPACE_LEFT_SIDEBAR_WIDTH);
  const [layoutConfig, setLayoutConfigState] = useState<WorkspaceLayoutConfig>({});
  const [chatSessionBarOpen, setChatSessionBarOpen] = useState(false);
  const leftSidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const chatPanelRef = useRef<PanelImperativeHandle | null>(null);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const hasSessionId = Boolean(currentSessionId);
  const shouldRenderChatPanel = hasSessionId || chatPanelDraftOpen;
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;
  const chatSessionPanelOpen = chatSessionBarOpen && !safeChatPanelCollapsed;
  const normalizedChatPanelWidth = clampPanelWidth(
    chatPanelWidth,
    CHAT_PANEL_MIN_WIDTH,
    CHAT_PANEL_MAX_WIDTH
  );
  const sidebarPanelSize = sidebarCollapsed ? 0 : leftSidebarWidth;
  const chatPanelSize = safeChatPanelCollapsed ? 0 : normalizedChatPanelWidth;
  const workspacePanelGroupKey = [
    'workspace-panels',
    shouldRenderChatPanel ? 'chat' : 'no-chat',
    chatSessionPanelOpen ? 'session' : 'no-session',
  ].join(':');
  const location = useLocation();
  const resourceRouteMatch = useMatch('/app/workspace/:resourceType/:resourceId');
  const resourceListRouteMatch = useMatch('/app/workspace/:resourceType');
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

  useResizablePanelSize({
    panelRef: leftSidebarPanelRef,
    size: sidebarPanelSize,
  });

  useResizablePanelSize({
    panelRef: chatPanelRef,
    size: chatPanelSize,
    enabled: shouldRenderChatPanel,
  });

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

  const handleLeftSidebarResize = useCallback(
    (panelSize: PanelSize) => {
      if (sidebarCollapsed) return;
      setLeftSidebarWidth(
        clampPanelWidth(
          panelSize.inPixels,
          WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH,
          WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH
        )
      );
    },
    [sidebarCollapsed]
  );

  const handleChatPanelResize = useCallback(
    (panelSize: PanelSize) => {
      if (safeChatPanelCollapsed) return;
      setChatPanelWidth(
        clampPanelWidth(panelSize.inPixels, CHAT_PANEL_MIN_WIDTH, CHAT_PANEL_MAX_WIDTH)
      );
    },
    [safeChatPanelCollapsed, setChatPanelWidth]
  );

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
    <ResizablePanelGroup
      key={workspacePanelGroupKey}
      orientation="horizontal"
      className={styles.root}
    >
      <ResizablePanel
        id="workspace-left-sidebar"
        panelRef={leftSidebarPanelRef}
        defaultSize={sidebarPanelSize}
        minSize={sidebarCollapsed ? 0 : WORKSPACE_LEFT_SIDEBAR_MIN_WIDTH}
        maxSize={sidebarCollapsed ? 0 : WORKSPACE_LEFT_SIDEBAR_MAX_WIDTH}
        disabled={sidebarCollapsed}
        className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
        aria-label="资源侧边栏"
        aria-hidden={sidebarCollapsed ? true : undefined}
        onResize={handleLeftSidebarResize}
      >
        <DriveSidebar collapsed={sidebarCollapsed} />
      </ResizablePanel>

      {!sidebarCollapsed ? <ResizableHandle className={styles.resizeHandle} /> : null}

      <ResizablePanel
        id="workspace-main"
        minSize={WORKSPACE_MAIN_MIN_WIDTH}
        className={styles.middleLayout}
      >
        <main className={`${styles.middleContent} ${styles.workspaceContent}`}>
          <WorkspaceFrame
            className={layoutConfig.className}
            bodyClassName={layoutConfig.bodyClassName}
            header={renderHeader()}
          >
            <Outlet context={outletContext} />
          </WorkspaceFrame>
        </main>
      </ResizablePanel>

      {shouldRenderChatPanel ? (
        <>
          {!safeChatPanelCollapsed ? <ResizableHandle className={styles.resizeHandle} /> : null}
          <ResizablePanel
            id="workspace-chat"
            panelRef={chatPanelRef}
            defaultSize={chatPanelSize}
            minSize={safeChatPanelCollapsed ? 0 : CHAT_PANEL_MIN_WIDTH}
            maxSize={safeChatPanelCollapsed ? 0 : CHAT_PANEL_MAX_WIDTH}
            disabled={safeChatPanelCollapsed}
            className={clsx(
              styles.rightSider,
              safeChatPanelCollapsed && styles.rightSiderCollapsed
            )}
            aria-label="聊天面板"
            aria-hidden={safeChatPanelCollapsed ? true : undefined}
            onResize={handleChatPanelResize}
          >
            <div className={styles.rightSiderInner}>
              <ChatPanel
                collapsed={safeChatPanelCollapsed}
                onNewChat={handleNewChat}
                sessionBarOpen={chatSessionBarOpen}
                onToggleSessionBar={handleToggleChatSessionBar}
                workspaceContext={chatWorkspaceContext}
                showCollapseButton={false}
              />
            </div>
          </ResizablePanel>
        </>
      ) : null}

      {chatSessionPanelOpen ? (
        <>
          <ResizableHandle className={styles.resizeHandle} />
          <ResizablePanel
            id="workspace-chat-session"
            defaultSize={CHAT_SESSION_PANEL_WIDTH}
            minSize={CHAT_SESSION_PANEL_MIN_WIDTH}
            maxSize={CHAT_SESSION_PANEL_MAX_WIDTH}
            className={styles.sessionPanel}
          >
            <ChatSessionBar
              activeSessionId={currentSessionId}
              onClose={handleCloseChatSessionBar}
              onSelectSession={handleSelectChatSession}
            />
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  );
}

export default WorkspaceLayout;
