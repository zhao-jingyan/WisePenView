import { useChatPanelStore } from '@/store';
import { useMount, useUpdateEffect } from 'ahooks';
import { useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';

const MIN_CHAT_PANEL_WIDTH = 320;
const MAX_CHAT_PANEL_WIDTH = 1020;

const clampWidth = (width: number, min: number, max: number): number =>
  Math.min(Math.max(width, min), max);

const getMaxChatPanelWidth = (): number => {
  if (typeof window === 'undefined') return MAX_CHAT_PANEL_WIDTH;
  const viewportBasedMax = window.innerWidth - 480;
  return Math.max(MIN_CHAT_PANEL_WIDTH, Math.min(MAX_CHAT_PANEL_WIDTH, viewportBasedMax));
};

const updateResizeGuide = (
  rootEl: HTMLDivElement | null,
  guideEl: HTMLDivElement | null,
  panelWidth: number
) => {
  if (!rootEl || !guideEl) return;
  const guideLeft = rootEl.clientWidth - panelWidth;
  guideEl.style.transform = `translateX(${guideLeft}px)`;
};

export interface UseChatPanelResizeResult {
  rootRef: RefObject<HTMLDivElement | null>;
  chatResizeGuideRef: RefObject<HTMLDivElement | null>;
  chatPanelWidth: number;
  chatResizing: boolean;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

/** 右侧对话栏宽度：挂载归一化、拖拽调整与 resize 引导线 */
export function useChatPanelResize(): UseChatPanelResizeResult {
  const chatPanelWidth = useChatPanelStore((state) => state.chatPanelWidth);
  const setChatPanelWidth = useChatPanelStore((state) => state.setChatPanelWidth);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chatResizeGuideRef = useRef<HTMLDivElement | null>(null);
  const chatPanelWidthRef = useRef(chatPanelWidth);
  const [chatResizing, setChatResizing] = useState(false);

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

  const onResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatPanelWidthRef.current;
    let frameId: number | null = null;
    let pendingWidth = startWidth;
    setChatResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.requestAnimationFrame(() => {
      updateResizeGuide(rootRef.current, chatResizeGuideRef.current, startWidth);
    });

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      pendingWidth = clampWidth(startWidth + deltaX, MIN_CHAT_PANEL_WIDTH, getMaxChatPanelWidth());
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        updateResizeGuide(rootRef.current, chatResizeGuideRef.current, pendingWidth);
        frameId = null;
      });
    };

    const handleMouseUp = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      updateResizeGuide(rootRef.current, chatResizeGuideRef.current, pendingWidth);
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
  };

  return {
    rootRef,
    chatResizeGuideRef,
    chatPanelWidth,
    chatResizing,
    onResizeStart,
  };
}
