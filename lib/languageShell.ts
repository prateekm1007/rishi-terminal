// X4 (Round 11): the dictionary shell — the ONE declaration of which
// message namespaces every route needs (sidebar/topbar/legal/common).
//
// Why this exists: lib/language.tsx used to statically import the FULL
// messages/en.json (28.6 kB raw / ~11.2 kB gzip), so every route's
// first-load JS carried every other route's strings. The shell subset
// now arrives as an RSC prop from the server layout, and each page's
// own namespaces arrive via <NamespaceProvider> (server pages import
// them server-side; client-page layouts do the same). The dictionary
// bytes move from blocking JS chunks to the streamed flight payload —
// and each page pays only for the namespaces it actually renders.
//
// Rule 14 (one source of truth): this list is imported by the layout
// (server), and by test/bundleBoundary.language.test.ts (the static
// coverage gate). Do not hand-duplicate it.

export const SHELL_NAMESPACES = [
  "nav", // Sidebar navigation labels
  "common", // cross-surface words (loading, saved, streak, …)
  "header", // top-bar strings
  "language", // language-selector labels
  "legal", // disclaimer/legal strings
] as const;

export type ShellNamespace = (typeof SHELL_NAMESPACES)[number];

export interface Messages {
  [key: string]: unknown;
}

/** Pick the shell subset out of a full locale dictionary (server-side). */
export function pickShell<T extends Messages>(full: T): Record<ShellNamespace, Messages> {
  const out: Partial<Record<ShellNamespace, Messages>> = {};
  for (const ns of SHELL_NAMESPACES) {
    const v = full[ns];
    if (v && typeof v === "object") out[ns] = v as Messages;
  }
  return out as Record<ShellNamespace, Messages>;
}
