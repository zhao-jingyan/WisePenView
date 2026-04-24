export type AuthSyncEventType = 'LOGIN' | 'LOGOUT' | 'UNAUTHORIZED';

interface AuthSyncPayload {
  type: AuthSyncEventType;
  sourceTabId: string;
  at: number;
}

const AUTH_SYNC_EVENT_KEY = 'wisepen:auth-sync-event';
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const emitAuthSyncEvent = (type: AuthSyncEventType): void => {
  try {
    const payload: AuthSyncPayload = {
      type,
      sourceTabId: TAB_ID,
      at: Date.now(),
    };
    localStorage.setItem(AUTH_SYNC_EVENT_KEY, JSON.stringify(payload));
  } catch {
    // 忽略浏览器存储异常，避免影响主流程
  }
};

export const subscribeAuthSyncEvent = (
  onEvent: (type: AuthSyncEventType) => void
): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== AUTH_SYNC_EVENT_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as AuthSyncPayload;
      if (!payload?.type || payload.sourceTabId === TAB_ID) return;
      onEvent(payload.type);
    } catch {
      // 非法 payload 直接忽略
    }
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
};
