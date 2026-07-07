export const DEFAULT_HEROUI_THEME = 'light' as const;

export const HEROUI_SYSTEM_THEME = 'system' as const;

/** 明暗模式 */
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

/** 主题配色 */
export const COLOR_SCHEME = {
  DEFAULT: 'default',
  FLORAL: 'floral',
  AQUA: 'aqua',
  SUNSET: 'sunset',
  EMERALD: 'emerald',
  LAVENDER: 'lavender',
  VANILLA: 'vanilla',
} as const;

export type ColorScheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];

export const DEFAULT_COLOR_SCHEME = COLOR_SCHEME.DEFAULT;

export interface ColorSchemeOption {
  id: ColorScheme;
  label: string;
  description: string;
}

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
  { id: COLOR_SCHEME.DEFAULT, label: '烟蓝', description: '蓝灰色系' },
  { id: COLOR_SCHEME.FLORAL, label: '樱粉', description: '柔粉色系' },
  { id: COLOR_SCHEME.AQUA, label: '青碧', description: '青蓝色系' },
  { id: COLOR_SCHEME.SUNSET, label: '暮橘', description: '暖橘色系' },
  { id: COLOR_SCHEME.EMERALD, label: '翠微', description: '翠绿色系' },
  { id: COLOR_SCHEME.LAVENDER, label: '紫烟', description: '薰衣草紫' },
  { id: COLOR_SCHEME.VANILLA, label: '暖杏', description: '暖金色系' },
];

export const THEME_MODE_OPTIONS: Array<{ id: ThemeMode; label: string; description: string }> = [
  { id: THEME_MODE.LIGHT, label: '浅色', description: '始终使用浅色界面' },
  { id: THEME_MODE.DARK, label: '深色', description: '始终使用深色界面' },
  { id: THEME_MODE.SYSTEM, label: '跟随系统', description: '随操作系统明暗设置切换' },
];
