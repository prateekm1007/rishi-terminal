/**
 * Y1 (founder round 12): restore fast pages — / and /stock/[symbol] are
 * ISR again (revalidate <= 60 s) with the quote peek happening at
 * REGENERATION, not per request.
 *
 * The X3 force-dynamic render answered the W5 stale-bake defect by making
 * EVERY first byte pay a server render — measured on production
 * (2026-10-04, main @ 9a3e682) as warm TTFB p50 0.315 s / p95 0.356 s,
 * above the founder's 300 ms p95 acceptance, with
 * `cache-control: no-store` + `x-vercel-cache: MISS` on every hit.
 *
 * Pinned here (source level; the built-manifest level is enforced
 * separately by scripts/ci/verifyIsrManifest.ts after `npm run build`):
 *   1. neither page exports `dynamic = 'force-dynamic'`;
 *   2. both pages export the literal `revalidate = 60` (statically
 *      analyzable — Next requires a literal, and <= 60 s is the Y1 cap);
 *   3. /stock/[symbol] exports generateStaticParams (the universe is
 *      pre-rendered — the build route table must list it as SSG/ISR);
 *   4. the stock page's quote peek is build-phase guarded (builds fetch
 *      nothing, hermetically — the peek runs at regeneration only). The
 *      Y2 rework widened the peek to ONE serveCachedQuotes batch covering
 *      the symbol AND its peers; the guard itself is unchanged.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");

const HOME = readFileSync(path.join(REPO, "app/page.tsx"), "utf8");
const STOCK = readFileSync(
  path.join(REPO, "app/stock/[symbol]/page.tsx"),
  "utf8",
);

describe("Y1 — / and /stock/[symbol] are ISR (revalidate <= 60 s)", () => {
  it("neither page is force-dynamic", () => {
    expect(HOME).not.toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
    expect(STOCK).not.toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
  });

  it("both pages export the literal revalidate = 60", () => {
    // Literal only: Next requires a statically analyzable value, and the
    // Y1 cap is <= 60 s. `revalidate = 60 * 1` would NOT be analyzable.
    expect(HOME).toMatch(/export\s+const\s+revalidate\s*=\s*60\s*;/);
    expect(STOCK).toMatch(/export\s+const\s+revalidate\s*=\s*60\s*;/);
  });

  it("no page revalidates slower than the 60 s cap", () => {
    for (const [name, src] of [["app/page.tsx", HOME], ["app/stock/[symbol]/page.tsx", STOCK]] as const) {
      const matches = src.matchAll(/export\s+const\s+revalidate\s*=\s*(\d+)\s*;/g);
      for (const [, raw] of matches) {
        expect(Number(raw), `${name} revalidate`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("/stock/[symbol] pre-renders the universe (generateStaticParams)", () => {
    expect(STOCK).toMatch(/export\s+async\s+function\s+generateStaticParams\s*\(/);
  });

  it("the stock page quote peek is build-phase guarded (hermetic build)", () => {
    // The peek must run at ISR regeneration, never during `next build`:
    // CI builds have no database, and a build-time bake of quote data
    // would reintroduce the W5 stale-bake defect the peek exists to avoid.
    // Y2: the peek is now ONE serveCachedQuotes batch ([key, ...peers]) —
    // the guard must cover the WHOLE batch, not just the symbol.
    expect(STOCK).toMatch(/isBuildPhase\(\)\s*\?\s*\{\}\s*:\s*await\s+serveCachedQuotes/);
  });
});
