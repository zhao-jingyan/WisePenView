import { useTheme as useHeroUITheme } from '@heroui/react';
import { useMount, useUpdateEffect } from 'ahooks';
import { useCallback, type ReactNode } from 'react';
import { ThemeContext, type ResolvedTheme, type ThemeMode } from './ThemeContextValue';

export { ThemeContext } from './ThemeContextValue';
export type { ResolvedTheme, ThemeContextValue, ThemeMode } from './ThemeContextValue';

const PREFERS_DARK_MEDIA = '(prefers-color-scheme: dark)';

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.(PREFERS_DARK_MEDIA).matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const el = document.documentElement;
  if (el.classList.contains(resolved) && el.getAttribute('data-theme') === resolved) return;
  el.classList.remove('light', 'dark');
  el.classList.add(resolved);
  el.setAttribute('data-theme', resolved);
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

export function ThemeContextProvider({
  children,
  defaultTheme = 'light',
}: {
  children: ReactNode;
  defaultTheme?: string;
}) {
  const { theme: heroTheme, setTheme: heroSetTheme } = useHeroUITheme(defaultTheme);

  const resolved = resolveTheme((heroTheme as ThemeMode) || 'light');

  // Apply on mount
  useMount(() => {
    applyThemeToDOM(resolved);
  });

  // Re-apply when resolved changes
  useUpdateEffect(() => {
    applyThemeToDOM(resolved);
  }, [resolved]);

  // Listen for system preference changes when in system mode
  useMount(() => {
    const media = window.matchMedia(PREFERS_DARK_MEDIA);
    const handler = () => {
      if (heroTheme !== 'system') return;
      applyThemeToDOM(getSystemPreference());
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  });

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      heroSetTheme(newTheme);
    },
    [heroSetTheme]
  );

  return (
    <ThemeContext.Provider
      value={{ theme: heroTheme as ThemeMode, resolvedTheme: resolved, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
