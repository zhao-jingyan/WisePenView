import type { ReactNode } from 'react';

import { DEFAULT_COLOR_SCHEME, DEFAULT_HEROUI_THEME, type ColorScheme } from './constants';
import { ThemeContextProvider } from './ThemeContext';
import { useColorScheme } from './useColorScheme';

type ThemeApplierProps = {
  children: ReactNode;
  defaultTheme?: string;
};

/** 根节点同步明暗与配色到 documentElement */
export function ThemeApplier({ children, defaultTheme = DEFAULT_HEROUI_THEME }: ThemeApplierProps) {
  return (
    <ThemeContextProvider defaultTheme={defaultTheme}>
      <ColorSchemeApplier defaultScheme={DEFAULT_COLOR_SCHEME}>{children}</ColorSchemeApplier>
    </ThemeContextProvider>
  );
}

function ColorSchemeApplier({
  children,
  defaultScheme,
}: {
  children: ReactNode;
  defaultScheme: string;
}) {
  useColorScheme(defaultScheme as ColorScheme);
  return <>{children}</>;
}
