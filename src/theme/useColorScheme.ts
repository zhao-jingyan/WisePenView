import { useState } from 'react';

import { COLOR_SCHEME, DEFAULT_COLOR_SCHEME, type ColorScheme } from './constants';

const COLOR_SCHEME_STORAGE_KEY = 'heroui-color-scheme';

const COLOR_SCHEME_VALUES = new Set<string>(Object.values(COLOR_SCHEME));

/** 登录/注册等页面始终使用默认主题，不应用用户自定义配色 */
const AUTH_PATH_PREFIXES = ['/login', '/register', '/reset-pwd', '/new-pwd', '/verify-email'];

function isAuthPage(): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
}

function isColorScheme(value: string): value is ColorScheme {
  return COLOR_SCHEME_VALUES.has(value);
}

function readStoredColorScheme(defaultScheme: ColorScheme): ColorScheme {
  if (typeof window === 'undefined') return defaultScheme;
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
  return stored && isColorScheme(stored) ? stored : defaultScheme;
}

// ═══════════════════════════════════════════════════════════════════
//  DOM 同步 — 在 React 生命周期之外运行
//  解决 ColorSchemeApplier（RouterProvider 的父组件）不会随路由
//  变化而 re-render 的问题。通过拦截 history API + popstate 来
//  感知所有页面导航，确保登录页始终使用默认配色。
// ═══════════════════════════════════════════════════════════════════

let lastAppliedScheme: string | undefined;

function syncDOM() {
  const effective = isAuthPage()
    ? DEFAULT_COLOR_SCHEME
    : readStoredColorScheme(DEFAULT_COLOR_SCHEME);
  if (effective !== lastAppliedScheme) {
    document.documentElement.setAttribute('data-color-scheme', effective);
    lastAppliedScheme = effective;
  }
}

// 模块加载时立即同步一次，并安装全局的 history 拦截器（只装一次）
if (typeof window !== 'undefined') {
  syncDOM();

  window.addEventListener('popstate', syncDOM);

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof origPush>) {
    origPush(...args);
    syncDOM();
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    origReplace(...args);
    syncDOM();
  };
}

// ═══════════════════════════════════════════════════════════════════

/** localStorage 持久化 + 同步 documentElement，只控制主题颜色 */
export function useColorScheme(defaultScheme: ColorScheme = DEFAULT_COLOR_SCHEME) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() =>
    readStoredColorScheme(defaultScheme)
  );

  const setColorScheme = (scheme: ColorScheme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
    setColorSchemeState(scheme);
    // 立即同步 DOM（此时 isAuthPage() 为 false，因为只有 app 内部才能改配色）
    syncDOM();
  };

  return { colorScheme, setColorScheme };
}
