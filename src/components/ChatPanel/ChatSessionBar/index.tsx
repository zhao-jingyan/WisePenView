import { useChatService } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { toast } from '@heroui/react';
import { useKeyPress, useMount, useRequest } from 'ahooks';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useState } from 'react';
import styles from '../style.module.less';
import type { ChatSessionBarProps } from './index.type';

const SESSION_PAGE_SIZE = 20;

const getSessionTitle = (session: ChatSession): string => session.title.trim() || '未命名对话';

const getSessionTime = (session: ChatSession): string =>
  formatTimestampToDateTime(session.updated_at || session.created_at) || '暂无时间';

function ChatSessionBar({ activeSessionId, onClose, onSelectSession }: ChatSessionBarProps) {
  const chatService = useChatService();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  const { loading, runAsync: runListSessions } = useRequest(
    (nextPage: number) => chatService.listSessions({ page: nextPage, size: SESSION_PAGE_SIZE }),
    { manual: true }
  );

  const loadSessions = async (nextPage: number) => {
    try {
      const payload = await runListSessions(nextPage);
      setSessions((previousSessions) =>
        nextPage === 1 ? payload.list : [...previousSessions, ...payload.list]
      );
      setPage(payload.page ?? nextPage);
      setTotalPage(payload.totalPage ?? 1);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  useMount(() => {
    void loadSessions(1);
  });

  useKeyPress(
    'esc',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    { events: ['keydown'], useCapture: true }
  );

  const initialLoading = loading && sessions.length === 0;
  const canLoadMore = !loading && page < totalPage;

  const handleLoadMore = () => {
    if (!canLoadMore) return;
    void loadSessions(page + 1);
  };

  return (
    <aside className={styles.sessionBar} aria-label="会话列表">
      <div className={styles.sessionBarHeader}>
        <div className={styles.sessionBarTitle}>会话</div>
        <button
          type="button"
          className={styles.sessionBarCloseButton}
          onClick={onClose}
          aria-label="关闭会话列表"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.sessionList}>
        {initialLoading ? <div className={styles.sessionStateText}>加载中...</div> : null}
        {!initialLoading && sessions.length === 0 ? (
          <div className={styles.sessionStateText}>暂无会话</div>
        ) : null}

        {sessions.map((session) => {
          const title = getSessionTitle(session);
          const active = session.id === activeSessionId;

          return (
            <button
              key={session.id}
              type="button"
              className={clsx(styles.sessionItem, active && styles.sessionItemActive)}
              onClick={() => onSelectSession(session)}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.sessionStatusDot} aria-hidden="true" />
              <span className={styles.sessionItemContent}>
                <span className={styles.sessionItemTitle} title={title}>
                  {title}
                </span>
                <span className={styles.sessionItemMeta}>{getSessionTime(session)}</span>
              </span>
            </button>
          );
        })}

        {canLoadMore ? (
          <button type="button" className={styles.sessionLoadMoreButton} onClick={handleLoadMore}>
            加载更多
          </button>
        ) : null}
        {loading && sessions.length > 0 ? (
          <div className={styles.sessionStateText}>加载中...</div>
        ) : null}
      </div>
    </aside>
  );
}

export default ChatSessionBar;
