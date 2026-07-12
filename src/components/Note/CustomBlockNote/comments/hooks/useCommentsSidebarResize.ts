import { useUpdateEffect } from 'ahooks';
import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { normalizeNoteResourceAsideWidth } from '@/components/Note/_store/noteResourceAsideConfig';

interface UseCommentsSidebarResizeOptions {
  width: number;
  onWidthChange: (width: number) => void;
}

interface UseCommentsSidebarResizeResult {
  resizing: boolean;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

/** 批注侧边栏左侧拖拽调宽，向左拖变宽、向右拖变窄。 */
export function useCommentsSidebarResize({
  width,
  onWidthChange,
}: UseCommentsSidebarResizeOptions): UseCommentsSidebarResizeResult {
  const widthRef = useRef(width);
  const [resizing, setResizing] = useState(false);

  useUpdateEffect(() => {
    widthRef.current = width;
  }, [width]);

  const onResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = widthRef.current;
    let pendingWidth = startWidth;

    setResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      pendingWidth = normalizeNoteResourceAsideWidth(startWidth + deltaX);
      onWidthChange(pendingWidth);
    };

    const handleMouseUp = () => {
      onWidthChange(pendingWidth);
      setResizing(false);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return { resizing, onResizeStart };
}
