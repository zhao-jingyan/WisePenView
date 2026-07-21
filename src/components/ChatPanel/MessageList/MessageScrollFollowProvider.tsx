import { useMessageScroller } from '@/components/_shadcn';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useCallback, useRef, type ReactNode, type UIEvent } from 'react';
import { MessageScrollFollowContext } from './MessageScrollFollowContext';

interface MessageScrollFollowProviderProps {
  children: ReactNode;
  scrollEdgeThreshold: number;
}

function MessageScrollFollowProvider({
  children,
  scrollEdgeThreshold,
}: MessageScrollFollowProviderProps) {
  const { scrollToEnd } = useMessageScroller();
  const isFollowingEndRef = useRef(true);
  const frameIdRef = useRef<number | null>(null);

  const cancelScheduledScroll = useCallback(() => {
    if (frameIdRef.current === null) return;
    window.cancelAnimationFrame(frameIdRef.current);
    frameIdRef.current = null;
  }, []);
  const scheduleScrollToEnd = useCallback(() => {
    if (!isFollowingEndRef.current || frameIdRef.current !== null) return;

    frameIdRef.current = window.requestAnimationFrame(() => {
      frameIdRef.current = null;
      if (isFollowingEndRef.current) scrollToEnd({ behavior: 'auto' });
    });
  }, [scrollToEnd]);
  const handleViewportScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const viewport = event.currentTarget;
      isFollowingEndRef.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= scrollEdgeThreshold;
    },
    [scrollEdgeThreshold]
  );
  const resumeFollowing = useCallback(() => {
    isFollowingEndRef.current = true;
  }, []);

  /**
   * 控制器卸载时取消尚未执行的补滚，避免切换会话或收起面板后访问失效的 viewport。
   */
  useEffectForce(() => cancelScheduledScroll, [cancelScheduledScroll]);

  return (
    <MessageScrollFollowContext.Provider
      value={{ handleViewportScroll, resumeFollowing, scheduleScrollToEnd }}
    >
      {children}
    </MessageScrollFollowContext.Provider>
  );
}

export default MessageScrollFollowProvider;
