import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, I18N_NAMESPACES, resources } from './resources';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: [I18N_NAMESPACES.COMMON, I18N_NAMESPACES.ERRORS],
    defaultNS: I18N_NAMESPACES.COMMON,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
