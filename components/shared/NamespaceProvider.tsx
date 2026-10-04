'use client';

// X4 (Round 11): per-page dictionary overlay.
//
// Server pages (and the layouts of client-rooted pages) import their own
// message namespaces server-side and pass them here as an RSC prop. The
// overlay merges into the language context with FILL-ONLY semantics —
// the current locale always wins, the overlay only fills keys the loaded
// dictionary lacks — which preserves the provider's exact fallback chain
// (locale -> English overlay -> humanized key) while keeping the strings
// out of the blocking JS chunks: they ride the streamed flight payload
// instead, and each page carries only the namespaces it renders.
//
// The overlay is synchronous on purpose: SSR renders through it, so the
// first byte keeps fully-translated strings (no flash of keys), and the
// hydration output is identical to the server render.

import { useContext, useMemo, type ReactNode } from 'react';
import {
  LanguageContextInternal,
  resolveT,
  type Messages,
} from '@/lib/language';

/** Deep merge where `overlay` only fills paths missing from `base`. */
function fillOnly(base: Messages, overlay: Messages): Messages {
  const out: Messages = { ...base };
  for (const k of Object.keys(overlay)) {
    const o = overlay[k];
    const b = out[k];
    if (
      b && o &&
      typeof b === 'object' && typeof o === 'object' &&
      !Array.isArray(b) && !Array.isArray(o)
    ) {
      out[k] = fillOnly(b as Messages, o as Messages);
    } else if (!(k in out)) {
      out[k] = o;
    }
  }
  return out;
}

export function NamespaceProvider({
  ns,
  children,
}: {
  /** e.g. {{ stock, chart }} — plain namespace objects from messages/en.json. */
  ns: Record<string, Messages>;
  children: ReactNode;
}) {
  const parent = useContext(LanguageContextInternal);

  const value = useMemo(() => {
    if (!parent) return undefined;
    if (!ns || Object.keys(ns).length === 0) return parent;
    const messages = fillOnly(parent.messages, ns);
    const en = fillOnly(parent.en, ns);
    return { ...parent, messages, en, t: resolveT(messages, en) };
  }, [parent, ns]);

  // Outside a LanguageProvider the children's own useLanguage() call will
  // throw with the provider's canonical error — no silent behaviour change.
  if (!value) return <>{children}</>;

  return (
    <LanguageContextInternal.Provider value={value}>
      {children}
    </LanguageContextInternal.Provider>
  );
}
