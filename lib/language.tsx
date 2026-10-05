'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pickShell, type Messages } from './languageShell';

type Locale = 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta' | 'pseudo';

export type { Messages };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
  /**
   * X4: the CURRENT dictionary (shell-en, or shell-en merged with a loaded
   * locale). Exposed so <NamespaceProvider> can derive page overlays that
   * win over the shell without copying the fallback logic.
   */
  messages: Messages;
  /**
   * X4: the English fallback dictionary (shell namespaces + any overlays).
   * Same lookup order the provider itself uses: locale -> English -> humanized.
   */
  en: Messages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

/** Exported for <NamespaceProvider> (same module keeps ONE fallback chain). */
export const LanguageContextInternal = LanguageContext;

/** Dot-path lookup used by both the root provider and the namespace overlay. */
export function lookup(src: Messages | undefined, key: string): string | null {
  if (!src) return null;
  const parts = key.split('.');
  let v: unknown = src;
  for (const p of parts) {
    if (v && typeof v === 'object' && p in (v as Messages)) v = (v as Messages)[p];
    else return null;
  }
  return typeof v === 'string' ? v : null;
}

/** Last-resort rendering so users never see "dashboard.heroTagline" raw. */
export function humanizeKey(key: string): string {
  const last = key.split('.').pop() || key;
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

export function resolveT(messages: Messages, en: Messages) {
  return (key: string): string => {
    // 1. Try current locale
    const primary = lookup(messages, key);
    if (primary) return primary;
    // 2. Fall back to English baseline
    const fallback = lookup(en, key);
    if (fallback) return fallback;
    // 3. Last resort: humanize the final key segment
    return humanizeKey(key);
  };
}

/**
 * Client i18n context. X4 (Round 11): the synchronous English baseline is
 * now the SHELL subset (lib/languageShell.ts) received as an RSC prop from
 * the server layout — the full en.json no longer rides the client bundle of
 * every route. Page-specific namespaces arrive via <NamespaceProvider>
 * (components/shared/NamespaceProvider.tsx); see this file's counterpart
 * test (test/bundleBoundary.language.test.ts) for the boundary contract.
 *
 * `shell` is required on purpose: a missing shell must be a build-time
 * complaint (this provider always renders SOMETHING), not a silent fallback
 * that quietly reintroduces the full-dictionary import.
 */
export function LanguageProvider({
  shell,
  children,
}: {
  shell: Record<string, Messages>;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Messages>(shell);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('rishi_locale') : null) as Locale | null;
    if (saved && ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'pseudo'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    if (locale === 'en') {
      setMessages(shell);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const mod = await import(`../messages/${locale}.json`);
        if (!cancelled) {
          setMessages({ ...shell, ...(mod.default || mod) });
        }
      } catch (err) {
        console.error(`Failed to load ${locale}.json — falling back to English`, err);
        if (!cancelled) setMessages(shell);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale, shell]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rishi_locale', next);
    }
  };

  const t = resolveT(messages, shell);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading, messages, en: shell }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Re-exported so the server layout can build the shell prop from the full
// dictionary without importing a 'use client' module for the helper.
export { pickShell };
