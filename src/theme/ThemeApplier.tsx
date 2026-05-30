import { useTheme } from '@heroui/react';
import type { ReactNode } from 'react';

import { DEFAULT_HEROUI_THEME } from './constants';

type ThemeApplierProps = {
  children: ReactNode;
  /**主题类型*/
  defaultTheme?: string;
};

export function ThemeApplier({ children, defaultTheme = DEFAULT_HEROUI_THEME }: ThemeApplierProps) {
  useTheme(defaultTheme);
  return <>{children}</>;
}
