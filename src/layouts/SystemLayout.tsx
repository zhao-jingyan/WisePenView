import React, { useCallback, useRef, useState } from 'react';
import { Layout } from 'antd';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { LuBot } from 'react-icons/lu';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import styles from './SystemLayout.module.less';

const { Content, Sider } = Layout;
const MIN_CHAT_PANEL_WIDTH = 320;
const MAX_CHAT_PANEL_WIDTH = 1020;
const CHAT_EXPAND_TRIGGER_EDGE_THRESHOLD = 64;

const clampWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(width, min), max);

const getMaxChatPanelWidth = (): number => {
  if (typeof window === 'undefined') return MAX_CHAT_PANEL_WIDTH;
  const viewportBasedMax = window.innerWidth - 480;
  return Math.max(MIN_CHAT_PANEL_WIDTH, Math.min(MAX_CHAT_PANEL_WIDTH, viewportBasedMax));
};

const SystemLayout: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chatResizeGuideRef = useRef<HTMLDivElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatResizing, setChatResizing] = useState(false);
  const [showChatExpandTrigger, setShowChatExpandTrigger] = useState(false);
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const chatPanelWidthRef = useRef(chatPanelWidth);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const hasSessionId = Boolean(currentSessionId);
  const safeChatPanelCollapsed = !hasSessionId || chatPanelCollapsed;

  useUpdateEffect(() => {
    if (hasSessionId) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [hasSessionId, setChatPanelCollapsed]);

  useMount(() => {
    const normalizedWidth = clampWidth(
      chatPanelWidth,
      MIN_CHAT_PANEL_WIDTH,
      getMaxChatPanelWidth()
    );
    if (normalizedWidth !== chatPanelWidth) {
      setChatPanelWidth(normalizedWidth);
      return;
    }
    chatPanelWidthRef.current = chatPanelWidth;
  });

  useUpdateEffect(() => {
    chatPanelWidthRef.current = chatPanelWidth;
  }, [chatPanelWidth]);

  const handleChatResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = chatPanelWidthRef.current;
      let frameId: number | null = null;
      let pendingWidth = startWidth;
      setChatResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.requestAnimationFrame(() => {
        if (rootRef.current && chatResizeGuideRef.current) {
          const guideLeft = rootRef.current.clientWidth - startWidth;
          chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
        }
      });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        pendingWidth = clampWidth(
          startWidth + deltaX,
          MIN_CHAT_PANEL_WIDTH,
          getMaxChatPanelWidth()
        );
        if (frameId !== null) return;
        frameId = window.requestAnimationFrame(() => {
          if (rootRef.current && chatResizeGuideRef.current) {
            const guideLeft = rootRef.current.clientWidth - pendingWidth;
            chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
          }
          frameId = null;
        });
      };

      const handleMouseUp = () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        if (rootRef.current && chatResizeGuideRef.current) {
          const guideLeft = rootRef.current.clientWidth - pendingWidth;
          chatResizeGuideRef.current.style.transform = `translateX(${guideLeft}px)`;
        }
        chatPanelWidthRef.current = pendingWidth;
        setChatPanelWidth(pendingWidth);
        setChatResizing(false);
        document.body.style.removeProperty('user-select');
        document.body.style.removeProperty('cursor');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [setChatPanelWidth]
  );

  const handleViewportMouseMove = useCallback((event: MouseEvent) => {
    const reachedRightEdge =
      window.innerWidth - event.clientX <= CHAT_EXPAND_TRIGGER_EDGE_THRESHOLD;
    setShowChatExpandTrigger(reachedRightEdge);
  }, []);

  const handleChatExpand = useCallback(() => {
    if (!hasSessionId) return;
    setChatPanelCollapsed(false);
  }, [hasSessionId, setChatPanelCollapsed]);

  useMount(() => {
    window.addEventListener('mousemove', handleViewportMouseMove);
  });

  useUnmount(() => {
    window.removeEventListener('mousemove', handleViewportMouseMove);
  });

  const shouldShowChatExpandTrigger =
    hasSessionId && safeChatPanelCollapsed && showChatExpandTrigger;

  return (
    <Layout
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      {/* 左侧 Sidebar */}
      <Sider className={styles.leftSider} width={308} theme="light" collapsed={sidebarCollapsed}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </Sider>

      {/* 中间布局 */}
      <Layout className={styles.middleLayout}>
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {shouldShowChatExpandTrigger && (
        <button
          type="button"
          className={styles.chatExpandTrigger}
          onClick={handleChatExpand}
          aria-label="展开右侧对话栏"
        >
          <LuBot className={styles.chatExpandTriggerIcon} />
        </button>
      )}

      {/* 右侧 AI Panel */}
      <Sider
        className={styles.rightSider}
        width="var(--chat-panel-width)"
        theme="light"
        collapsed={safeChatPanelCollapsed}
        collapsedWidth={0}
        trigger={null}
      >
        {!safeChatPanelCollapsed && (
          <button
            type="button"
            className={`${styles.chatResizeHandle} ${chatResizing ? styles.chatResizeHandleActive : ''}`}
            onMouseDown={handleChatResizeStart}
            aria-label="调整右侧边栏宽度"
          />
        )}
        <div className={styles.rightSiderInner}>
          {hasSessionId ? <ChatPanel collapsed={safeChatPanelCollapsed} /> : null}
        </div>
      </Sider>
    </Layout>
  );
};

export default SystemLayout;
