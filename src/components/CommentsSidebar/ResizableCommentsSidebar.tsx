import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

import { normalizeCommentsSidebarWidth } from './resize';
import styles from './style.module.less';

type ResizableCommentsSidebarProps = {
  width: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
};

export function ResizableCommentsSidebar({
  width,
  onWidthChange,
  children,
}: ResizableCommentsSidebarProps) {
  const widthRef = useRef(width);
  const [resizing, setResizing] = useState(false);

  useUpdateEffect(() => {
    widthRef.current = width;
  }, [width]);

  const handleResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = widthRef.current;
    let pendingWidth = startWidth;

    setResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      pendingWidth = normalizeCommentsSidebarWidth(startWidth + startX - moveEvent.clientX);
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

  const panelStyle = {
    ['--comments-sidebar-width' as string]: `${width}px`,
  } as CSSProperties;

  return (
    <div
      className={clsx(styles.resizablePanel, resizing && styles.resizablePanelResizing)}
      style={panelStyle}
    >
      <button
        type="button"
        className={styles.resizeHandle}
        aria-label="调整批注栏宽度"
        onMouseDown={handleResizeStart}
      />
      {children}
    </div>
  );
}
