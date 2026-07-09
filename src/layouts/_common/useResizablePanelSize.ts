import { useMount, useUpdateEffect } from 'ahooks';
import type { RefObject } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

type ResizablePanelSize = number | string;

interface UseResizablePanelSizeOptions {
  panelRef: RefObject<PanelImperativeHandle | null>;
  size: ResizablePanelSize;
  enabled?: boolean;
}

/** 同步外部折叠状态到 react-resizable-panels 的命令式尺寸模型。 */
export function useResizablePanelSize({
  panelRef,
  size,
  enabled = true,
}: UseResizablePanelSizeOptions) {
  const resizePanel = () => {
    if (!enabled) return;
    panelRef.current?.resize(size);
  };

  useMount(() => {
    resizePanel();
  });

  useUpdateEffect(() => {
    resizePanel();
  }, [enabled, size]);
}
