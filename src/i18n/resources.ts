import enUSAuth from './locales/en-US/auth';
import enUSCommon from './locales/en-US/common';
import zhCNAuth from './locales/zh-CN/auth';
import zhCNCommon from './locales/zh-CN/common';

export const DEFAULT_LANGUAGE = 'zh-CN' as const;

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const I18N_NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
} as const;

export const resources = {
  'zh-CN': {
    [I18N_NAMESPACES.COMMON]: zhCNCommon,
    [I18N_NAMESPACES.AUTH]: zhCNAuth,
  },
  'en-US': {
    [I18N_NAMESPACES.COMMON]: enUSCommon,
    [I18N_NAMESPACES.AUTH]: enUSAuth,
  },
} as const;
