import type { ReactNode } from 'react';

import { DEFAULT_COLOR_SCHEME, DEFAULT_HEROUI_THEME } from './constants';
import { ThemeContextProvider } from './ThemeContext';
import { useColorScheme } from './useColorScheme';
import { useThemeShape } from './useThemeShape';

type ThemeApplierProps = {
  children: ReactNode;
  defaultTheme?: string;
};

/** 根节点同步明暗与配色到 documentElement */
export function ThemeApplier({ children, defaultTheme = DEFAULT_HEROUI_THEME }: ThemeApplierProps) {
  return (
    <ThemeContextProvider defaultTheme={defaultTheme}>
      <ThemeShapeApplier>{children}</ThemeShapeApplier>
    </ThemeContextProvider>
  );
}

function ThemeShapeApplier({ children }: { children: ReactNode }) {
  useColorScheme(DEFAULT_COLOR_SCHEME);
  useThemeShape();
  return <>{children}</>;
}
