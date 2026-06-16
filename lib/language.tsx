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

// Synchronous English import — guarantees fallback on first render (no flash of keys)
import enMessages from '../messages/en.json';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Messages>(enMessages as Messages);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('rishi_locale') : null) as Locale | null;
    if (saved && ['en', 'hi', 'bn', 'mr', 'te', 'ta'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    if (locale === 'en') {
      setMessages(enMessages as Messages);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const mod = await import(`../messages/${locale}.json`);
        if (!cancelled) {
          setMessages({ ...(enMessages as Messages), ...(mod.default || mod) });
        }
      } catch (err) {
        console.error(`Failed to load ${locale}.json — falling back to English`, err);
        if (!cancelled) setMessages(enMessages as Messages);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rishi_locale', next);
    }
  };

  function lookup(src: any, key: string): string | null {
    if (!src) return null;
    const parts = key.split('.');
    let v: any = src;
    for (const p of parts) {
      if (v && typeof v === 'object' && p in v) v = v[p];
      else return null;
    }
    return typeof v === 'string' ? v : null;
  }

  const t = (key: string): string => {
    // 1. Try current locale
    const primary = lookup(messages, key);
    if (primary) return primary;
    // 2. Fall back to English baseline
    const fallback = lookup(enMessages as Messages, key);
    if (fallback) return fallback;
    // 3. Last resort: humanize the final key segment so users never see "dashboard.heroTagline"
    const last = key.split('.').pop() || key;
    return last
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, c => c.toUpperCase())
      .trim();
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