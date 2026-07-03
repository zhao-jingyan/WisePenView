import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DeferredOverlayContext,
  type DeferredContentProps,
  type DeferredOverlayContextValue,
  type DeferredOverlayProviderProps,
  type DeferredOverlayState,
  type DeferredRenderable,
} from './DeferredContentContext';

export type {
  DeferredContentProps,
  DeferredOverlayProviderProps,
  DeferredOverlayState,
} from './DeferredContentContext';

function renderDeferredContent(
  content: DeferredRenderable | undefined,
  state: DeferredOverlayState
): ReactNode {
  if (typeof content === 'function') {
    return content(state);
  }
  return content ?? null;
}

function useDeferredReady(isOpen: boolean, enabled: boolean, delay: number): boolean {
  const [ready, setReady] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearDeferredReady = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const scheduleDeferredReady = useCallback(() => {
    clearDeferredReady();
    if (!enabled || !isOpen) {
      setReady(false);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setReady(true);
      });
    }, Math.max(0, delay));
  }, [clearDeferredReady, delay, enabled, isOpen, setReady]);

  useMount(() => {
    scheduleDeferredReady();
  });

  useUnmount(() => {
    clearDeferredReady();
  });

  useUpdateEffect(() => {
    scheduleDeferredReady();
  }, [scheduleDeferredReady]);

  return enabled ? ready : isOpen;
}

export function DeferredOverlayProvider({
  children,
  delay,
  enabled = true,
  isOpen,
}: DeferredOverlayProviderProps) {
  const ready = useDeferredReady(isOpen, enabled, delay);
  const value = useMemo<DeferredOverlayContextValue>(
    () => ({
      delay,
      enabled,
      isOpen,
      ready,
    }),
    [delay, enabled, isOpen, ready]
  );

  return <DeferredOverlayContext.Provider value={value}>{children}</DeferredOverlayContext.Provider>;
}

export function DeferredContent({
  children,
  disabled = false,
  fallback = null,
}: DeferredContentProps) {
  const context = useContext(DeferredOverlayContext);
  const state: DeferredOverlayState = {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: disabled || context == null || !context.enabled ? true : context.ready,
  };

  return <>{renderDeferredContent(state.ready ? children : fallback, state)}</>;
}
