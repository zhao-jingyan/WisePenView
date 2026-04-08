import { create } from 'zustand';

const PENDING_VERIFY_EMAIL_KEY = 'pendingVerifyEmail';

/** 发起邮箱验证时写入；回调页用 peek 只读展示（不清除），验证成功后再 clear；localStorage 跨标签 */
type PendingVerifyEmailState = {
  email: string | null;
  setEmail: (email: string) => void;
  /** 仅读取（内存或 localStorage），不清除；供外部打开的 VerifyEmail 展示，避免 Strict Mode 双次 effect 误删 */
  peekPendingEmail: () => string | null;
  clear: () => void;
};

function readFromStorage(): string | null {
  try {
    const s = localStorage.getItem(PENDING_VERIFY_EMAIL_KEY);
    return s ? s : null;
  } catch {
    return null;
  }
}

function removeFromStorage(): void {
  try {
    localStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export const usePendingVerifyEmailStore = create<PendingVerifyEmailState>()((set, get) => ({
  email: null,

  setEmail: (email) => {
    try {
      localStorage.setItem(PENDING_VERIFY_EMAIL_KEY, email);
    } catch {
      /* ignore */
    }
    set({ email });
  },

  peekPendingEmail: () => get().email ?? readFromStorage(),

  clear: () => {
    removeFromStorage();
    set({ email: null });
  },
}));

export const clearPendingVerifyEmailStore = (): void => {
  usePendingVerifyEmailStore.getState().clear();
};
