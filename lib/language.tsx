'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta';

interface Messages {
  [key: string]: any;
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Messages>({});
  const [fallbackMessages, setFallbackMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);


  // Always load English fallback messages (prevents showing raw keys if locale file is missing/incomplete)
  useEffect(() => {
    (async () => {
      try {
        const fallback = await import('../messages/en.json');
        setFallbackMessages(fallback.default || fallback);
      } catch (e) {
        console.error('Failed to load fallback English messages', e);
        setFallbackMessages({});
      }
    })();
  }, []);

  // Initialize locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('rishi_locale') as Locale;
    if (savedLocale && ['en', 'hi', 'bn', 'mr', 'te', 'ta'].includes(savedLocale)) {
      setLocaleState(savedLocale);
    } else {
      setLocaleState('en');
    }
  }, []);

  // Load messages whenever locale changes
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      try {
        const msgs = await import(`../messages/${locale}.json`);
        setMessages(msgs.default || msgs);
        setIsLoading(false);
      } catch (error) {
        console.error(`Failed to load messages for ${locale}`, error);
        try {
          // Fallback to English
          const fallback = await import('../messages/en.json');
          setMessages(fallback.default || fallback);
        } catch (fallbackError) {
          console.error('Failed to load fallback English messages', fallbackError);
          setMessages({});
        }
        setIsLoading(false);
      }
    }
    loadMessages();
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('rishi_locale', newLocale);
  };

  const t = (key: string): string => {
    const getValue = (src: any, k: string): string | null => {
      if (!src) return null;
      const parts = k.split('.');
      let v: any = src;
      for (const p of parts) {
        if (v && typeof v === 'object' && p in v) {
          v = v[p];
        } else {
          return null;
        }
      }
      return typeof v === 'string' ? v : null;
    };

    const primary = getValue(messages, key);
    if (primary) return primary;

    const fallback = getValue(fallbackMessages, key);
    if (fallback) return fallback;

    return key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}