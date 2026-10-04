// app/stock/[symbol]/loading.tsx — the stock-page Suspense fallback.
//
// CLS GATE FIX (Round 13, folded into Z3 — it blocks Z3's own CI): the old
// skeleton used Tailwind-style classes (h-48, bg-zinc-900/40, animate-pulse,
// min-h-screen…) that DO NOT EXIST in this project — there is no Tailwind:
// app/globals.css is a hand-written design system and the compiled CSS
// contains none of those classes (verified: grep for 'h-48'/'zinc' in
// .next/static/chunks/*.css -> 0 matches). The skeleton therefore rendered
// at ZERO height, dropping the LegalDisclaimer strip into the viewport at
// first paint (measured: strip at y=165, then displaced when the real
// content streamed in — a deterministic +0.044 layout shift on ~5/6 cold
// loads; the Lighthouse CLS floor of 0.1 breached on 4 consecutive
// first-attempt CI runs, passing only on reruns).
//
// This rewrite uses inline styles ONLY (the repo's design idiom — see
// every component in components/) and mirrors the real page's section
// rhythm so the fallback-to-content swap displaces as little as possible.
// Deterministic: no clocks, no randomness (Rule 18).
export default function StockLoading() {
  const block = (height: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    height,
    background: "rgba(24,24,27,0.4)",
    border: "1px solid rgba(39,39,42,0.8)",
    borderRadius: 12,
    ...extra,
  });

  return (
    <div style={{ minHeight: "1200px", padding: "0 0 32px" }}>
      {/* Page header: name + price hero (mirrors the ~100px title row) */}
      <div style={{ ...block(96, { marginBottom: 20, borderRadius: 16 }) }} />

      {/* Consensus hero (mirrors the ~210px hero card) */}
      <div style={{ ...block(210, { marginBottom: 20, borderRadius: 16 }) }} />

      {/* Bull/Bear + radar two-column row (mirrors the ~190px grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={block(190)} />
        <div style={block(190)} />
      </div>

      {/* Metrics panel (mirrors the ~150px card) */}
      <div style={{ ...block(150, { marginBottom: 20 }) }} />

      {/* Rishi grid: three columns of cards (mirrors the tall grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={block(180)} />
        ))}
      </div>
    </div>
  );
}
