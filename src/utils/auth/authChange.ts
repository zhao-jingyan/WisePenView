import { clearAllServiceCaches } from '@/services/cacheRegistry';
import { clearAllZustandStores } from '@/store';

interface AuthChangePayload {
  sourceTabId: string;
  at: number;
}

const AUTH_CHANGE_EVENT_KEY = 'wisepen:auth-change-event';
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const emitAuthChangeEvent = (): void => {
  try {
    const payload: AuthChangePayload = {
      sourceTabId: TAB_ID,
      at: Date.now(),
    };
    localStorage.setItem(AUTH_CHANGE_EVENT_KEY, JSON.stringify(payload));
  } catch {
    // 忽略浏览器存储异常，避免影响主流程
  }
};

export const subscribeAuthChangeEvent = (): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== AUTH_CHANGE_EVENT_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as AuthChangePayload;
      if (!payload?.sourceTabId || payload.sourceTabId === TAB_ID) return;
      handleAuthChangeEvent();
    } catch {
      // 非法 payload 直接忽略
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
};

export const handleAuthChangeEvent = (): void => {
  clearAllServiceCaches();
  clearAllZustandStores();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};
