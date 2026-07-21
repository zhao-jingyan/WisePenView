import type { Model } from '@/components/ChatPanel/index.type';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { ChatStatus } from 'ai';
import { ArrowDown } from 'lucide-react';
import type { ReactNode } from 'react';
import HistoryLoader from './HistoryLoader';
import Message from './Message';
import MessageScrollFollowProvider from './MessageScrollFollowProvider';
import Welcome from './Welcome';
import styles from './style.module.less';
import { useMessageScrollFollow } from './useMessageScrollFollow';

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
  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="end"
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScrollFollowProvider scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}>
        <MessageListContent
          messages={messages}
          canLoadMoreHistory={canLoadMoreHistory}
          loadingMoreHistory={loadingMoreHistory}
          onLoadMoreHistory={onLoadMoreHistory}
          status={status}
          model={model}
          footer={footer}
        />
      </MessageScrollFollowProvider>
    </MessageScrollerProvider>
  );
}

function MessageListContent({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  status,
  model,
  footer,
}: MessageListProps) {
  const { handleViewportScroll, resumeFollowing } = useMessageScrollFollow();
  const isGenerating = status === 'submitted' || status === 'streaming';

  return (
    <MessageScroller className={styles.container}>
      <MessageScrollerViewport className={styles.viewport} onScroll={handleViewportScroll}>
        <MessageScrollerContent className={styles.scrollColumn}>
          <StreamingScrollFollower active={isGenerating} messages={messages} />

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

      <MessageScrollerButton className={styles.scrollToBottomButton} onClick={resumeFollowing}>
        <ArrowDown size={14} />
        <span className={styles.srOnly}>滚动到底部</span>
      </MessageScrollerButton>
    </MessageScroller>
  );
}

interface StreamingScrollFollowerProps {
  active: boolean;
  messages: WisePenUIMessage[];
}

function StreamingScrollFollower({ active, messages }: StreamingScrollFollowerProps) {
  const { scheduleScrollToEnd } = useMessageScrollFollow();

  /**
   * 流式 Markdown 会在子组件 effect 中再次提交，外层 ResizeObserver 可能错过该帧的高度变化。
   * 每次流消息更新后于下一帧校正到底部；仅在用户仍停留于底部时执行，避免覆盖阅读位置。
   */
  useEffectForce(() => {
    if (active) scheduleScrollToEnd();
  }, [active, messages, scheduleScrollToEnd]);

  return null;
}

export default MessageList;
