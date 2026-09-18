import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import { STRINGS, type Locale, type Strings, tr } from '../i18n/strings';
import { setFormatLocale } from '../utils/format';

const LANG_KEY = 'app_locale';

interface LangContextType {
  locale: Locale;
  isRTL: boolean;
  t: (key: keyof Strings, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => Promise<void>;
}

const LangContext = createContext<LangContextType>({
  locale: 'ar',
  isRTL: true,
  t: (k, v) => tr('ar', k, v),
  setLocale: async () => {},
});

function deviceLocale(): Locale {
  try {
    const tags = Localization.getLocales().map((l) => (l.languageCode || '').toLowerCase());
    if (tags.includes('fr')) return 'fr';
    if (tags.includes('en')) return 'en';
    return 'ar';
  } catch {
    return 'ar';
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        const initial: Locale =
          saved === 'ar' || saved === 'fr' || saved === 'en' ? saved : deviceLocale();
        setLocaleState(initial);
        setFormatLocale(initial);
        const rtl = initial === 'ar';
        if (I18nManager.isRTL !== rtl) {
          I18nManager.forceRTL(rtl);
          I18nManager.allowRTL(rtl);
        }
      } catch {}
    })();
  }, []);

  const t = useCallback(
    (key: keyof Strings, vars?: Record<string, string | number>) => tr(locale, key, vars),
    [locale]
  );

  const setLocale = useCallback(
    async (l: Locale) => {
      if (l === locale) return;
      try {
        await SecureStore.setItemAsync(LANG_KEY, l);
      } catch {}
      const wasRTL = locale === 'ar';
      const willRTL = l === 'ar';
      setLocaleState(l);
      setFormatLocale(l);
      if (wasRTL !== willRTL) {
        // RTL flip requires a full reload to re-mirror the layout.
        I18nManager.forceRTL(willRTL);
        I18nManager.allowRTL(true);
        try {
          await Updates.reloadAsync();
        } catch {}
      }
    },
    [locale]
  );

  return (
    <LangContext.Provider value={{ locale, isRTL: locale === 'ar', t, setLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export { STRINGS };
export type { Locale };
