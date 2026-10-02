import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { CRYPTO_ASSETS } from '@/data/crypto';
import { COMMODITIES } from '@/data/markets';
import { fetchLivePrice } from '@/lib/livePrice';
import { scoreSatoshiBodhi } from '@/lib/scorers/crypto/satoshibodhi';
import { scoreVitalikVeda } from '@/lib/scorers/crypto/vitalikVeda';
import { scoreMichaelSaylor } from '@/lib/scorers/crypto/michaelsaylor';
import { scoreJimRogers } from '@/lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '@/lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '@/lib/scorers/commodity/danielyergin';
import { normalizeSymbolInput } from '@/lib/registry/validateInput';

/**
 * GET /api/gurus?kind=crypto[&symbol=BTC] — the SERVER-side surface for
 * crypto/commodity guru verdicts (R3, round 2).
 *
 * The crypto list and detail pages used to compute every guru verdict in
 * the browser (from the bundled asset data + live overlay) and then hide
 * cards by tier. This route computes them on the server and serves them.
 *
 * Commit M3 (founder decision 2026-10-02 — every feature free): the
 * tier-slicing is GONE. Every caller — anonymous or signed in — receives
 * every verdict in full. The historical score>=50 teaser rule (crypto) and
 * the Energy-only free rule (commodities) are deleted; there is no
 * `locked` field on the wire and no locked remainder to render.
 */

interface GuruVerdict {
  id: string;
  name: string;
  score: number | null;
  label: string;
  insight: string;
  comps: Array<{ label: string; v: number; wt: number; detail: string }>;
}

const GURU_SCORERS = [
  { id: 'satoshi', name: 'Satoshi Bodhi', target: 'BTC', scorer: scoreSatoshiBodhi },
  { id: 'vitalik', name: 'Vitalik Veda', target: 'ETH', scorer: scoreVitalikVeda },
  { id: 'saylor', name: 'Michael Saylor', target: 'BTC', scorer: scoreMichaelSaylor },
];

const COMMODITY_SCORERS = [
  { id: 'jimrogers', name: 'Jim Rogers', scorer: scoreJimRogers },
  { id: 'rickrule', name: 'Rick Rule', scorer: scoreRickRule },
  { id: 'danielyergin', name: 'Daniel Yergin', scorer: scoreDanielYergin },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const symbolRaw = searchParams.get('symbol');
  // R5: unified input gate — the symbol must be one the app knows.
  const symbol = symbolRaw !== null ? normalizeSymbolInput(symbolRaw) : null;
  if (symbolRaw !== null && symbol === null) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 });
  }

  if (kind !== 'crypto' && kind !== 'commodity') {
    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
  }

  // Session read kept for abuse telemetry symmetry with the other verdict
  // routes; under free access it no longer changes the response.
  await getSessionUser();

  // Live price overlay, same source the client pages use (CoinGecko via
  // lib/livePrice). Falls back to the static seed price when unreachable —
  // the verdict is then computed on seed data, never fabricated.
  // Coder Directions 2026-10-02 §14 (Rule 16): an upstream that discloses
  // no change observation is UNAVAILABILITY, not a 0% move — the overlay
  // records null and the scorer input falls back to the SEED's recorded
  // change (a real observation, honestly stale), exactly like price does.
  // The old `: 0` fabricated a no-move market that the upstream never
  // reported.
  const overlay: Record<string, { price: number; changePct: number | null }> = {};
  const targets = [...new Set(GURU_SCORERS.map((g) => g.target))];
  await Promise.all(
    targets.map(async (t) => {
      try {
        const live = await fetchLivePrice(t);
        if (live && Number.isFinite(live.price) && live.price > 0) {
          overlay[t] = { price: live.price, changePct: Number.isFinite(live.change) ? live.change : null };
        }
      } catch {
        // keep the seed value for this target
      }
    }),
  );

  if (kind === 'commodity') {
    const detail = COMMODITIES.find((c) => c.symbol === symbol);
    if (symbol && !detail) {
      return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
    }

    // Live overlay for the symbols the gurus score.
    const targets = detail ? [detail.symbol] : COMMODITIES.map((c) => c.symbol);
    const overlayC: Record<string, { price: number; changePct: number | null }> = {};
    await Promise.all(
      targets.map(async (t) => {
        try {
          const live = await fetchLivePrice(t);
          if (live && Number.isFinite(live.price) && live.price > 0) {
            overlayC[t] = { price: live.price, changePct: Number.isFinite(live.change) ? live.change : null };
          }
        } catch {
          // keep the seed value for this target
        }
      }),
    );

    const scoreCommodity = (c: (typeof COMMODITIES)[number]) => {
      const live = overlayC[c.symbol];
      // §14 (Rule 16): unavailable live change falls back to the SEED's
      // recorded change — never to a fabricated 0. The `change:` override
      // is GONE: it wrote a PERCENT into the absolute-change field (a
      // units bug); no scorer consumes `change`, and the seed spread
      // already carries the correct seed value.
      return COMMODITY_SCORERS.map((g) =>
        g.scorer({
          ...c,
          price: live?.price ?? c.price,
          changePct: live?.changePct ?? c.changePct,
        }),
      );
    };

    if (detail) {
      // Detail page: every per-guru verdict, in full, for every caller.
      const gurus: GuruVerdict[] = COMMODITY_SCORERS.map((g, i) => {
        const scored = scoreCommodity(detail)[i];
        return {
          id: g.id, name: g.name, score: scored.score, label: scored.label,
          insight: scored.insight, comps: scored.comps,
        };
      });
      return NextResponse.json(
        { kind, symbol: detail.symbol, category: detail.category, gurus },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // List page: per-commodity average plus the per-guru verdict rows.
    // (List mode keeps scores only — verdict text/comps are per-symbol
    // detail; this is a payload decision, not a gate: ?symbol= serves the
    // full text to anyone.)
    const commodities = COMMODITIES.map((c) => {
      const results = scoreCommodity(c);
      const valid = results.filter((r) => r.score !== null);
      const avg =
        valid.length > 0
          ? Math.round(valid.reduce((s, r) => s + (r.score as number), 0) / valid.length)
          : null; // T11: insufficient data is null, never 0
      return {
        symbol: c.symbol,
        category: c.category,
        avg,
        gurus: results.map((r, i) => ({ id: COMMODITY_SCORERS[i].id, initials: COMMODITY_SCORERS[i].name.slice(0, 2).toUpperCase(), score: r.score })),
      };
    });
    return NextResponse.json(
      { kind, commodities },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const gurus: GuruVerdict[] = GURU_SCORERS.filter((g) => !symbol || g.target === symbol).map((g) => {
    const asset = CRYPTO_ASSETS.find((a) => a.symbol === g.target);
    if (!asset) {
      return { id: g.id, name: g.name, score: null, label: 'Insufficient Data', insight: '', comps: [] };
    }
    const live = overlay[g.target];
    const scored = g.scorer({
      ...asset,
      price: live?.price ?? asset.price,
      // §14 (Rule 16): unavailable live change falls back to the SEED's
      // recorded 24h change — never to a fabricated 0.
      change24h: live?.changePct ?? asset.change24h,
    });
    return {
      id: g.id,
      name: g.name,
      score: scored.score,
      label: scored.label,
      insight: scored.insight,
      comps: scored.comps,
    };
  });

  return NextResponse.json(
    { kind, gurus },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
