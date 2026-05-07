'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'hi' | 'gu';

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
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('rishi_locale') as Locale;
    if (savedLocale && ['en', 'hi', 'gu'].includes(savedLocale)) {
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
          const fallback = await import(`../messages/en.json`);
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
    if (!messages || Object.keys(messages).length === 0) {
      return key; // Return key if messages not loaded yet
    }

    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
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