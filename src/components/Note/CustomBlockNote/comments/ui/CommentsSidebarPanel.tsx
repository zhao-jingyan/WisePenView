import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

import { MIN_NOTE_RESOURCE_ASIDE_WIDTH } from '@/components/Note/_store/noteResourceAsideConfig';
import { useCommentsSidebarResize } from '../hooks/useCommentsSidebarResize';
import styles from './commentStyles.module.less';

type CommentsSidebarPanelProps = {
  width: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
};

export function CommentsSidebarPanel({
  width,
  onWidthChange,
  children,
}: CommentsSidebarPanelProps) {
  const { resizing, onResizeStart } = useCommentsSidebarResize({ width, onWidthChange });

  const panelStyle = {
    ['--comments-sidebar-width' as string]: `${width}px`,
    ['--comments-sidebar-min-width' as string]: `${MIN_NOTE_RESOURCE_ASIDE_WIDTH}px`,
  } as CSSProperties;

  return (
    <div
      className={clsx(
        'wise-pen-comments-sidebar-panel',
        styles.threadsSidebarPanel,
        resizing && styles.threadsSidebarPanelResizing
      )}
      style={panelStyle}
    >
      <button
        type="button"
        className={styles.threadsSidebarResizeHandle}
        aria-label="调整批注栏宽度"
        onMouseDown={onResizeStart}
      />
      {children}
    </div>
  );
}
