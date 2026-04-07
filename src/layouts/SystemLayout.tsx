import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { LuBot } from 'react-icons/lu';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import styles from './SystemLayout.module.less';

const { Content, Sider } = Layout;

const SystemLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);

  return (
    <Layout className={styles.root}>
      {/* 左侧 Sidebar */}
      <Sider className={styles.leftSider} width={240} theme="light" collapsed={sidebarCollapsed}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </Sider>

      {/* 中间布局 */}
      <Layout className={styles.middleLayout}>
        {chatPanelCollapsed && (
          <div className={styles.chatHandleZone}>
            <button
              type="button"
              className={styles.chatExpandHandle}
              aria-label="展开聊天栏"
              onClick={() => setChatPanelCollapsed(false)}
            >
              <LuBot />
            </button>
          </div>
        )}
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {/* 右侧 AI Panel */}
      <Sider
        className={styles.rightSider}
        width={380}
        theme="light"
        collapsed={chatPanelCollapsed}
        collapsedWidth={0}
        trigger={null}
      >
        <div className={styles.rightSiderInner}>
          <ChatPanel
            collapsed={chatPanelCollapsed}
            onToggle={() => setChatPanelCollapsed(!chatPanelCollapsed)}
          />
        </div>
      </Sider>
    </Layout>
  );
};

export default SystemLayout;
