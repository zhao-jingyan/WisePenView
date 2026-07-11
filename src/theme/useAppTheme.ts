import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeContextValue';

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeContextProvider');
  return ctx;
}
