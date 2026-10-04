'use client';

// X4 (Round 11): the global search bar defers to after hydration.
//
// The search box is an interactive enhancement — it does nothing until the
// user types, so its JS (router hook, debounce/fetch machinery, dropdown
// a11y) does not belong in the first-load script set of EVERY route (it is
// rendered by the root layout). `ssr: false` keeps the chunk out of the
// initial scripts entirely; the placeholder below replicates the real
// bar's box model BY CONSTRUCTION (same outer wrapper, same inner row
// styles, a disabled input with the real input's exact inline styles and
// the "/" hint) so the swap-in causes no layout shift — the height is not
// a guessed constant. The Playwright combobox contract
// (test/smoke/shell.spec.ts) waits up to 20s for the input — deferral is
// well inside that budget.
//
// First-byte honesty: the placeholder renders a disabled, aria-hidden
// input with no placeholder text and claims nothing.
//
// A11y: the disabled input is non-focusable (disabled + tabIndex -1), so
// aria-hidden is legal here (an aria-hidden element must not contain
// focusable content).

import dynamic from 'next/dynamic';

const GlobalSearchBar = dynamic(
  () => import('./GlobalSearchBar').then(m => ({ default: m.GlobalSearchBar })),
  {
    ssr: false,
    loading: () => <SearchBarPlaceholder />,
  },
);

/** Structural replica of GlobalSearchBar's pre-focus markup (inert). */
function SearchBarPlaceholder() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0B1020',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '0 14px',
        gap: 10,
        boxSizing: 'border-box',
      }} aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="#64748B" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {/* Same inline styles as the real input (components/ui/GlobalSearchBar.tsx)
            so the row height matches exactly; disabled + tabIndex -1 keeps it
            out of the a11y tree and tab order. */}
        <input
          disabled
          tabIndex={-1}
          aria-hidden="true"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#F8FAFC',
            fontSize: 13,
            fontFamily: 'monospace',
            padding: '10px 0',
            letterSpacing: 0.3,
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <span style={{
          fontSize: 10,
          color: '#374151',
          fontFamily: 'monospace',
          background: '#111827',
          padding: '2px 6px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          /
        </span>
      </div>
    </div>
  );
}

export default function LazyGlobalSearchBar() {
  return <GlobalSearchBar />;
}
