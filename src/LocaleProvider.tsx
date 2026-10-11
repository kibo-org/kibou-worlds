import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Locale = 'en' | 'ja';
const Context = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: 'en', setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <Context.Provider value={{ locale, setLocale }}>{children}</Context.Provider>;
}

export const useLocale = () => useContext(Context);
