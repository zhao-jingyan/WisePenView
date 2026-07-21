import type { Model } from '@/components/ChatPanel/index.type';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { ChatStatus } from 'ai';
import { ArrowDown } from 'lucide-react';
import { useRef, type ReactNode, type RefObject, type UIEvent } from 'react';
import HistoryLoader from './HistoryLoader';
import Message from './Message';
import Welcome from './Welcome';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;

interface MessageListProps {
  messages: WisePenUIMessage[];
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  status: ChatStatus;
  model: Model | null;
  footer?: ReactNode;
}

function MessageList({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  status,
  model,
  footer,
}: MessageListProps) {
  const isGenerating = status === 'submitted' || status === 'streaming';
  const isFollowingEndRef = useRef(true);

  const handleViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    isFollowingEndRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <=
      AUTO_LOAD_EDGE_THRESHOLD;
  };

  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="end"
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScroller className={styles.container}>
        <MessageScrollerViewport className={styles.viewport} onScroll={handleViewportScroll}>
          <MessageScrollerContent className={styles.scrollColumn}>
            <StreamingScrollFollower
              active={isGenerating}
              messages={messages}
              isFollowingEndRef={isFollowingEndRef}
            />

            <div className={styles.messagesBody}>
              {messages.length === 0 ? (
                <MessageScrollerItem className={styles.welcomeItem}>
                  <Welcome />
                </MessageScrollerItem>
              ) : (
                <>
                  <HistoryLoader
                    canLoadMoreHistory={canLoadMoreHistory}
                    loadingMoreHistory={loadingMoreHistory}
                    onLoadMoreHistory={onLoadMoreHistory}
                  />

                  {messages.map((message) => (
                    <MessageScrollerItem key={message.id} messageId={message.id}>
                      <Message
                        message={message}
                        model={model}
                        streaming={
                          message.id === messages[messages.length - 1]?.id && status === 'streaming'
                        }
                      />
                    </MessageScrollerItem>
                  ))}
                </>
              )}
            </div>

            {footer ? <div className={styles.footerSlot}>{footer}</div> : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton className={styles.scrollToBottomButton}>
          <ArrowDown size={14} />
          <span className={styles.srOnly}>滚动到底部</span>
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface StreamingScrollFollowerProps {
  active: boolean;
  messages: WisePenUIMessage[];
  isFollowingEndRef: RefObject<boolean>;
}

function StreamingScrollFollower({
  active,
  messages,
  isFollowingEndRef,
}: StreamingScrollFollowerProps) {
  const { scrollToEnd } = useMessageScroller();

  /**
   * 流式 Markdown 会在子组件 effect 中再次提交，外层 ResizeObserver 可能错过该帧的高度变化。
   * 每次流消息更新后于下一帧校正到底部；仅在用户仍停留于底部时执行，避免覆盖阅读位置。
   */
  useEffectForce(() => {
    if (!active || !isFollowingEndRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollToEnd({ behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [active, isFollowingEndRef, messages, scrollToEnd]);

  return null;
}

export default MessageList;
