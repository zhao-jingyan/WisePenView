import { useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';

/**
 * 对布尔标志做平滑处理：
 * - flag 变为 true 后延迟 showDelay ms 才返回 true（期间恢复则取消）
 * - 一旦返回 true，至少保持 minShowDuration ms 后才允许回落为 false
 */
export function useSmoothFlag(flag: boolean, showDelay: number, minShowDuration: number): boolean {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useUpdateEffect(() => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);

    if (flag) {
      if (!visibleRef.current) {
        showTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          visibleRef.current = true;
          setVisible(true);
        }, showDelay);
      }
    } else if (visibleRef.current) {
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, minShowDuration - elapsed);
      if (remaining <= 0) {
        visibleRef.current = false;
        setVisible(false);
      } else {
        hideTimerRef.current = setTimeout(() => {
          visibleRef.current = false;
          setVisible(false);
        }, remaining);
      }
    }
  }, [flag]);

  useUnmount(() => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  });

  return visible;
}
