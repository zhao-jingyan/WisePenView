import ChatPanel from '@/components/ChatPanel';
import { clearNewChatSessionStore, useCurrentChatSessionStore } from '@/store';
import { useMount, useUpdateEffect } from 'ahooks';
import { useParams } from 'react-router-dom';
import styles from './style.module.less';

function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
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

  return (
    <div className={styles.root}>
      <div className={styles.chatPanelHost}>
        <ChatPanel collapsed={false} fullWidth showHeader={false} />
      </div>
    </div>
  );
}

export default ChatPage;
