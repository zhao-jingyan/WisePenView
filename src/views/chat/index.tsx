import ChatPanel from '@/components/ChatPanel';
import ChatSessionBar from '@/components/ChatPanel/ChatSessionBar';
import type { ChatSession } from '@/domains/Chat';
import { clearNewChatSessionStore, useCurrentChatSessionStore } from '@/store';
import { useMount, useUpdateEffect } from 'ahooks';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './style.module.less';

const BASE = '/app/chat';

function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sessionBarOpen, setSessionBarOpen] = useState(false);
  const currentSessionId = useCurrentChatSessionStore((s) => s.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((s) => s.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((s) => s.clearCurrentSession);

  useMount(() => {
    if (routeSessionId) {
      setCurrentSession({ id: routeSessionId, title: '' });
    } else {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
  });

  useUpdateEffect(() => {
    if (routeSessionId) {
      setCurrentSession({ id: routeSessionId, title: '' });
    } else {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
  }, [routeSessionId]);

  const handleNewChat = useCallback(() => {
    setSessionBarOpen(false);
    clearCurrentSession();
    clearNewChatSessionStore();
    navigate(BASE, { replace: true });
  }, [clearCurrentSession, navigate]);

  const handleToggleSessionBar = useCallback(() => {
    setSessionBarOpen((open) => !open);
  }, []);

  const handleCloseSessionBar = useCallback(() => {
    setSessionBarOpen(false);
  }, []);

  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      setCurrentSession({ id: session.id, title: session.title });
      clearNewChatSessionStore();
      setSessionBarOpen(false);
      navigate(`${BASE}/${session.id}`);
    },
    [navigate, setCurrentSession]
  );

  return (
    <div className={styles.root}>
      <div className={styles.chatPanelHost}>
        <ChatPanel
          collapsed={false}
          fullWidth
          onNewChat={handleNewChat}
          sessionBarOpen={sessionBarOpen}
          onToggleSessionBar={handleToggleSessionBar}
        />
      </div>
      {sessionBarOpen ? (
        <ChatSessionBar
          activeSessionId={currentSessionId}
          onClose={handleCloseSessionBar}
          onSelectSession={handleSelectSession}
        />
      ) : null}
    </div>
  );
}

export default ChatPage;
