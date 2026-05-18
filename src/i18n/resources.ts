import enUSAuth from './locales/en-US/auth';
import enUSCommon from './locales/en-US/common';
import enUSErrors from './locales/en-US/errors';
import zhCNAuth from './locales/zh-CN/auth';
import zhCNCommon from './locales/zh-CN/common';
import zhCNErrors from './locales/zh-CN/errors';

export const DEFAULT_LANGUAGE = 'zh-CN' as const;

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const I18N_NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  ERRORS: 'errors',
} as const;

export const resources = {
  'zh-CN': {
    [I18N_NAMESPACES.COMMON]: zhCNCommon,
    [I18N_NAMESPACES.AUTH]: zhCNAuth,
    [I18N_NAMESPACES.ERRORS]: zhCNErrors,
  },
  'en-US': {
    [I18N_NAMESPACES.COMMON]: enUSCommon,
    [I18N_NAMESPACES.AUTH]: enUSAuth,
    [I18N_NAMESPACES.ERRORS]: enUSErrors,
  },
} as const;
