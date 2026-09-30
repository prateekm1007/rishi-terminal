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
import { isPremium } from '@/lib/premium';
import { normalizeSymbolInput } from '@/lib/registry/validateInput';

/**
 * GET /api/gurus?kind=crypto[&symbol=BTC] — the SERVER-side surface for
 * crypto guru verdicts (R3, round 2).
 *
 * The crypto list and detail pages used to compute every guru verdict in
 * the browser (from the bundled asset data + live overlay) and then hide
 * cards by tier — the verdicts were in the JS bundle and client memory for
 * every visitor. This route computes them on the server and tier-slices
 * the response:
 *
 * - anonymous / seeker: gurus whose score >= 50 (the established free rule
 *   from the old list page) come back as full verdicts; the rest come back
 *   as { id, score, locked: true } teasers WITHOUT insight/comps.
 * - student / disciple: every verdict in full.
 *
 * kind=commodity follows the page-level rule that already existed: Energy
 * commodities are free; every other category is premium. The list mode
 * returns the per-commodity average (the free teaser every card shows
 * today) plus a locked flag; ?symbol= returns the per-guru verdicts, full
 * only when unlocked.
 *
 * Free/paid split is a founder decision pending — see docs/PAID_CONTENT.md.
 */

interface GuruVerdict {
  id: string;
  name: string;
  score: number | null;
  label: string;
  locked: boolean;
  /** Absent when locked — paid content never serialised for a free tier. */
  insight?: string;
  comps?: Array<{ label: string; v: number; wt: number; detail: string }>;
}

const FREE_SCORE_THRESHOLD = 50;

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

  const user = await getSessionUser();
  const tier = user?.tier ?? 'seeker';
  const premium = isPremium(tier);

  // Live price overlay, same source the client pages use (CoinGecko via
  // lib/livePrice). Falls back to the static seed price when unreachable —
  // the verdict is then computed on seed data, never fabricated.
  const overlay: Record<string, { price: number; changePct: number }> = {};
  const targets = [...new Set(GURU_SCORERS.map((g) => g.target))];
  await Promise.all(
    targets.map(async (t) => {
      try {
        const live = await fetchLivePrice(t);
        if (live && Number.isFinite(live.price) && live.price > 0) {
          overlay[t] = { price: live.price, changePct: Number.isFinite(live.change) ? live.change : 0 };
        }
      } catch {
        // keep the seed value for this target
      }
    }),
  );

  if (kind === 'commodity') {
    // Page-level rule (kept): Energy is free, other categories premium.
    const detail = COMMODITIES.find((c) => c.symbol === symbol);
    if (symbol && !detail) {
      return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
    }

    // Live overlay for the symbols the gurus score.
    const targets = detail ? [detail.symbol] : COMMODITIES.map((c) => c.symbol);
    const overlayC: Record<string, { price: number; changePct: number }> = {};
    await Promise.all(
      targets.map(async (t) => {
        try {
          const live = await fetchLivePrice(t);
          if (live && Number.isFinite(live.price) && live.price > 0) {
            overlayC[t] = { price: live.price, changePct: Number.isFinite(live.change) ? live.change : 0 };
          }
        } catch {
          // keep the seed value for this target
        }
      }),
    );

    const scoreCommodity = (c: (typeof COMMODITIES)[number]) => {
      const live = overlayC[c.symbol];
      return COMMODITY_SCORERS.map((g) =>
        g.scorer({
          ...c,
          price: live?.price ?? c.price,
          changePct: live?.changePct ?? c.changePct ?? 0,
          change: live?.changePct ?? c.change ?? 0,
        }),
      );
    };

    if (detail) {
      // Detail page: per-guru verdicts, full only when unlocked.
      const unlocked = premium || detail.category === 'Energy';
      const gurus: GuruVerdict[] = COMMODITY_SCORERS.map((g, i) => {
        const scored = scoreCommodity(detail)[i];
        if (!unlocked) {
          return { id: g.id, name: g.name, score: scored.score, label: scored.label, locked: true };
        }
        return {
          id: g.id, name: g.name, score: scored.score, label: scored.label, locked: false,
          insight: scored.insight, comps: scored.comps,
        };
      });
      return NextResponse.json(
        { kind, tier, symbol: detail.symbol, category: detail.category, gurus },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // List page: the average teaser every card already shows (free), plus
    // the locked flag. Per-guru verdict content is NOT serialised here.
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
        locked: !premium && c.category !== 'Energy',
        // Free teaser the cards already show: per-guru SCORES only (the
        // verdict text/comps are never sent in list mode).
        gurus: results.map((r, i) => ({ id: COMMODITY_SCORERS[i].id, initials: COMMODITY_SCORERS[i].name.slice(0, 2).toUpperCase(), score: r.score })),
      };
    });
    return NextResponse.json(
      { kind, tier, commodities },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const gurus: GuruVerdict[] = GURU_SCORERS.filter((g) => !symbol || g.target === symbol).map((g) => {
    const asset = CRYPTO_ASSETS.find((a) => a.symbol === g.target);
    if (!asset) {
      return { id: g.id, name: g.name, score: null, label: 'Insufficient Data', locked: false };
    }
    const live = overlay[g.target];
    const scored = g.scorer({
      ...asset,
      price: live?.price ?? asset.price,
      change24h: live?.changePct ?? asset.change24h ?? 0,
    });
    const unlocked = premium || (scored.score !== null && scored.score >= FREE_SCORE_THRESHOLD);
    if (!unlocked) {
      // Teaser only — the paid fields stay server-side.
      return { id: g.id, name: g.name, score: scored.score, label: scored.label, locked: true };
    }
    return {
      id: g.id,
      name: g.name,
      score: scored.score,
      label: scored.label,
      locked: false,
      insight: scored.insight,
      comps: scored.comps,
    };
  });

  return NextResponse.json(
    { kind, tier, gurus },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
