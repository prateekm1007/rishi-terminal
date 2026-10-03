#!/usr/bin/env node
// scripts/freeAccessInventory.mjs — Commit M1 (Coder Directions §6).
//
// Repository-wide importer/reference scan for every tier/pricing/payment
// concept, producing the DURABLE classification artifact that must exist
// BEFORE anything is deleted:
//   docs/evidence/commit-m/free-access-inventory.json  (machine-readable)
//   docs/evidence/commit-m/free-access-inventory.md    (human review)
//
// Discipline (not a naive grep):
//   - every matching tracked file must be EXPLICITLY classified below;
//   - an unclassified match FAILS the script (exit 1) — the inventory can
//     never silently shrink;
//   - classifications distinguish runtime entitlement / payment surface /
//     database persistence (historical) / documentation / test / legitimate
//     non-entitlement concept, per the Coder Directions taxonomy.
//
// Rule 24: this inventory is evidence, not a gate; the GATE is
// scripts/freeAccessAudit.mjs (Commit M5) which fails on residual
// entitlement coupling. This script fails on incomplete CLASSIFICATION.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "docs", "evidence", "commit-m");

// ── the scan vocabulary (Coder Directions §6, verbatim) ───────────────────
const TERMS = {
  TIER_CONFIG: { re: /TIER_CONFIG/, word: false },
  WisdomTier: { re: /WisdomTier/, word: false },
  isPremium: { re: /\bisPremium\b/, word: true },
  isDisciple: { re: /\bisDisciple\b/, word: true },
  canAccess: { re: /\bcanAccess\b/, word: true },
  canViewStock: { re: /\bcanViewStock\b/, word: true },
  getRishisVisible: { re: /\bgetRishisVisible\b/, word: true },
  getRishisByTier: { re: /\bgetRishisByTier\b/, word: true },
  student: { re: /\bstudent\b/i, word: true },
  disciple: { re: /\bdisciple\b/i, word: true },
  seeker: { re: /\bseeker\b/i, word: true },
  tierExpiresAt: { re: /tierExpiresAt|tier_expires_at/, word: false },
  tier_purchased: { re: /tier_purchased/, word: false },
  pricing: { re: /\bpricing\b/i, word: true },
  upgrade: { re: /\bupgrade\b/i, word: true },
  checkout: { re: /\bcheckout\b/i, word: true },
  Razorpay: { re: /razorpay/i, word: false },
  paid: { re: /\bpaid\b/i, word: true },
  premium: { re: /\bpremium\b/i, word: true },
};

// ── classification map ─────────────────────────────────────────────────────
// category: one of the Coder Directions §6 classes. disposition: what Commit
// M does with it. EVERY file the scan matches must appear here, else exit 1.
const CATEGORIES = {
  'runtime-entitlement': 'runtime entitlement - tier gates feature access',
  'payment-surface': 'payment purchase surface (UI + HTTP)',
  'ui-copy': 'UI copy / navigation touching tiers or pricing',
  'db-persistence': 'database persistence / historical payment record (PRESERVED)',
  'dead-code': 'unused code carrying tier semantics',
  documentation: 'documentation / configuration / legal copy',
  test: 'test coverage / tooling',
  'legitimate-concept': 'legitimate non-entitlement concept (display rank, XP level, market terminology, provenance anti-upgrade)',
};

const CLASSIFY = {
  // ── runtime entitlement (gate removed in M3/M5 — feature stays) ─────────
  'lib/premium.ts': { cat: 'runtime-entitlement', note: 'TIER_CONFIG, tier predicates, anonymous stock-view counter — the tier model itself' },
  'lib/chat/personaAccess.ts': { cat: 'runtime-entitlement', note: 'getRishisByTier / isPersonaAllowed — tier roster for chat personas' },
  'app/api/chat/personas/route.ts': { cat: 'runtime-entitlement', note: 'serves the caller tier roster' },
  'app/api/chat/route.ts': { cat: 'runtime-entitlement', note: 'persona 403 by tier + tier-keyed DAILY_QUOTA' },
  'app/api/gurus/route.ts': { cat: 'runtime-entitlement', note: 'isPremium() locks crypto/commodity guru verdicts into teasers' },
  'app/api/rishis/[symbol]/route.ts': { cat: 'runtime-entitlement', note: 'verdict slice by TIER_CONFIG[user.tier].rishisVisible' },
  'app/stock/[symbol]/page.tsx': { cat: 'runtime-entitlement', note: 'RSC embeds only the seeker slice' },
  'lib/scoring/slimIndex.ts': { cat: 'runtime-entitlement', note: 'freeScores sliced to seeker visibility' },
  'lib/fno/rishiPrompts.ts': { cat: 'dead-code', note: 'zero runtime importers (only its test) — F&O fnoAccess tier axis + getRishisByTier' },
  'lib/chat/rishiEngine.ts': { cat: 'runtime-entitlement', note: 'client fallback engine personas carry the access axis as tier' },
  'hooks/useTier.ts': { cat: 'runtime-entitlement', note: 'client tier state that drives client-side gates' },
  'components/stock/StockPageClient.tsx': { cat: 'runtime-entitlement', note: 'skips verdict upgrade when tier === seeker' },
  'components/lab/IntelligenceTab.tsx': { cat: 'runtime-entitlement', note: 'verdict upgrade only for paid tiers' },
  'components/lab/CompareTab.tsx': { cat: 'runtime-entitlement', note: 'verdict upgrade only for paid tiers' },
  'components/crypto/CryptoDetailClient.tsx': { cat: 'runtime-entitlement', note: 'premium-locked guru verdict display' },
  'app/crypto/page.tsx': { cat: 'runtime-entitlement', note: 'premium flag + UpgradePrompt + locked-teaser copy' },
  'app/commodities/page.tsx': { cat: 'runtime-entitlement', note: 'premium flag + UpgradePrompt + category gate' },
  'components/stock/RishiGrid.tsx': { cat: 'runtime-entitlement', note: 'upgrade banner / lock teasers keyed on tier' },
  'app/api/auth/me/route.ts': { cat: 'runtime-entitlement', note: 'returns tier + tierExpiresAt to clients (feeds client gates)' },
  'lib/auth/session.ts': { cat: 'runtime-entitlement', note: 'Tier type + resolveTier — DB tier currently drives product policy' },
  'lib/consensus/sanitize.ts': { cat: 'runtime-entitlement', note: 'sanitizes verdicts to a tier visibility count (comments describe the paid slice)' },
  'components/chat/RishiChat.tsx': { cat: 'runtime-entitlement', note: 'roster-fallback surface described as the seeker set {damani}' },
  'components/stock/KnowledgeGraphView.tsx': { cat: 'runtime-entitlement', note: 'comments describe the paid-tier graph upgrade path (logic is prop-driven)' },

  // ── payment purchase surface (retired in M4) ────────────────────────────
  'app/pricing/page.tsx': { cat: 'payment-surface', note: 'paid-tier storefront with upgrade buttons + Razorpay checkout' },
  'app/pricing/layout.tsx': { cat: 'payment-surface', note: 'pricing page metadata mentioning tiers' },
  'components/premium/PaymentButton.tsx': { cat: 'payment-surface', note: 'Razorpay Checkout integration' },
  'components/premium/UpgradePrompt.tsx': { cat: 'payment-surface', note: 'upgrade modal (Rs 499/year paid perks)' },
  'app/api/payment/route.ts': { cat: 'payment-surface', note: 'Razorpay order create (POST) + client verify (PUT)' },
  'app/api/payment/webhook/route.ts': { cat: 'payment-surface', note: 'Razorpay webhook -> grant_tier_for_payment' },
  'lib/payments/grantTier.ts': { cat: 'payment-surface', note: 'grant RPC wrapper + TIER_PRICES (499/1999 INR paise)' },
  'lib/payments/signatures.ts': { cat: 'payment-surface', note: 'Razorpay signature verification' },
  'proxy.ts': { cat: 'payment-surface', note: 'webhook matcher/routing comment' },
  'package.json': { cat: 'payment-surface', note: 'unused razorpay npm dependency (no importers; checkout loads via script tag)' },
  'package-lock.json': { cat: 'payment-surface', note: 'transitive lock entries — regenerated when the dependency is removed' },
  'next.config.js': { cat: 'payment-surface', note: 'CSP allows checkout.razorpay.com / api.razorpay.com origins — obsolete once payments retire' },
  'scripts/checkEnv.ts': { cat: 'payment-surface', note: 'env checker referencing RAZORPAY vars' },

  // ── UI copy / navigation ────────────────────────────────────────────────
  'components/Sidebar.tsx': { cat: 'ui-copy', note: 'nav link to /pricing — kept (page becomes the free-access notice)' },
  'components/dashboard/DashboardClient.tsx': { cat: 'ui-copy', note: 'View Plans CTA to /pricing — relabel (no plans exist)' },
  'messages/en.json': { cat: 'ui-copy', note: 'locale copy: pricing/tiers/personaLocked keys (updated), formula premium strings (kept)' },
  'messages/hi.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },
  'messages/bn.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },
  'messages/mr.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },
  'messages/te.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },
  'messages/ta.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },
  'messages/gu.json': { cat: 'ui-copy', note: 'locale copy (same treatment as en.json)' },

  // ── database persistence / historical records (PRESERVED verbatim) ──────
  'lib/db/migrations/001_initial_schema.sql': { cat: 'db-persistence', note: 'users.tier, tier_expires_at, transactions(tier_purchased) — historical schema; PRESERVED (Coder Directions 12)' },
  'lib/db/migrations/002_supabase_auth.sql': { cat: 'db-persistence', note: 'handle_new_user trigger defaulting tier — historical; PRESERVED' },
  'lib/db/migrations/007_grant_tier_rpc.sql': { cat: 'db-persistence', note: 'grant_tier_for_payment RPC — historical settlement logic; PRESERVED' },
  'production-receipt.json': { cat: 'db-persistence', note: 'historical deployment receipt (probe output mentions tiers) — superseded by the M12 receipt' },
  'production-ugly-path-matrix.json': { cat: 'db-persistence', note: 'historical probe evidence — superseded by the M11 matrix' },
  'docs/evidence/commit-l/prod-ai-ugly-path-anonymous.json': { cat: 'db-persistence', note: 'historical Commit-L evidence — preserved verbatim' },
  'test/migrations.rls.test.ts': { cat: 'test', note: 'RLS tests pinning the PRESERVED tier columns/triggers' },

  // ── documentation / configuration / legal copy (updated in M6) ──────────
  'docs/PAID_CONTENT.md': { cat: 'documentation', note: 'paid/free matrix — superseded by the free-access decision' },
  'docs/ROADMAP-STATUS.md': { cat: 'documentation', note: 'FD-7 register + tier references' },
  'docs/ROADMAP.md': { cat: 'documentation', note: 'task definitions mentioning pricing' },
  'docs/RELEASE.md': { cat: 'documentation', note: 'release notes mentioning tiers' },
  'docs/DATA_SOURCES.md': { cat: 'documentation', note: 'data-source doc mentioning tiers' },
  'docs/AI_LOOP.md': { cat: 'documentation', note: 'AI loop doc tier references' },
  'docs/PROVENANCE.md': { cat: 'documentation', note: 'pricing field-name mention (data provenance, not commerce)' },
  'docs/FREE_OPEN_DATA_RESEARCH.md': { cat: 'documentation', note: 'provider research mention (premium = paid API tier of a vendor)' },
  '.env.example': { cat: 'documentation', note: 'RAZORPAY_* section + CHAT_MODEL default' },
  'app/privacy/page.tsx': { cat: 'documentation', note: 'privacy copy: subscription/tier/Razorpay statements — updated to reflect the free product + retained historical records' },
  'app/terms/page.tsx': { cat: 'documentation', note: 'terms section 4 (paid tiers and refunds) — rewritten for the free product; counsel review still FD-14' },
  'README.md': { cat: 'documentation', note: 'pricing mention in overview' },
  'AUDIT_FINDINGS_COMPREHENSIVE.md': { cat: 'documentation', note: 'historical audit report — preserved verbatim (evidence)' },
  'AUDIT_REPORT_20260616_233109.md': { cat: 'documentation', note: 'historical audit report — preserved verbatim (evidence)' },
  'CONSTITUTION.md': { cat: 'documentation', note: 'governing rules — DO NOT MODIFY (tier mentions are rule evidence)' },
  'data/security-master/SOURCES.md': { cat: 'documentation', note: 'NSE column documentation (PAID UP VALUE is an exchange field name)' },

  // ── tests / tooling (updated or kept with the code under test) ──────────
  'test/session.tier.test.ts': { cat: 'test', note: 'resolveTier policy tests — subject removed in M3' },
  'test/rishis.route.test.ts': { cat: 'test', note: 'tier-slice expectations for /api/rishis/[symbol] — updated' },
  'test/persona.registry.test.ts': { cat: 'test', note: 'registry access-axis expectations — updated' },
  'test/persona.clientProjection.test.ts': { cat: 'test', note: 'client projection incl. access axis — updated' },
  'test/chat.route.personaAuth.test.ts': { cat: 'test', note: 'persona 403-by-tier contract — replaced by all-personas-for-all-users contract' },
  'test/chat.limits.test.ts': { cat: 'test', note: 'quota by tier expectations — updated to the single free quota' },
  'test/chat.quota.assembly.test.ts': { cat: 'test', note: 'quota assembly by tier — updated' },
  'test/chat.quota.order.test.ts': { cat: 'test', note: 'quota order (tier mention in mocks) — updated' },
  'test/evalChat.golden.test.ts': { cat: 'test', note: 'golden-set tier references — updated' },
  'test/fno.registry.test.ts': { cat: 'test', note: 'F&O tier policy verbatim expectations — deleted with the dead module' },
  'test/chat.provider.test.ts': { cat: 'test', note: 'provider tests with tier mocks — updated' },
  'test/chat.route.canonicalEvidence.test.ts': { cat: 'test', note: 'route tests with tier mocks — updated' },
  'test/payments.grantTier.test.ts': { cat: 'test', note: 'grant RPC wrapper tests — deleted with the retired surface' },
  'test/payments.signatures.test.ts': { cat: 'test', note: 'signature tests — deleted with the retired surface' },
  'test/webhook.signature.test.ts': { cat: 'test', note: 'webhook signature tests — deleted; replaced by the 410 retirement contract' },
  'test/webhook.grantStatus.test.ts': { cat: 'test', note: 'webhook grant tests — deleted with the retired surface' },
  'test/setup.ts': { cat: 'test', note: 'test bootstrap tier references — updated' },
  'test/clientBoundary.test.ts': { cat: 'test', note: 'client-graph boundary incl. premium.ts import rules — updated' },
  'test/chat.grounding.l2.test.ts': { cat: 'test', note: 'provenance ANTI-UPGRADE tests (AI concept, not commerce) — kept' },
  'test/csp.headers.test.ts': { cat: 'test', note: 'upgrade-insecure-requests CSP tests — kept' },
  'test/fixtures/eval-chat/golden.ts': { cat: 'test', note: 'golden questions tier references — updated' },
  'test/seo.sitemap.test.ts': { cat: 'test', note: '/pricing sitemap entry — kept (page remains as the free-access notice)' },
  'scripts/evalChatRunner.ts': { cat: 'test', note: 'eval harness tier field — updated with the quota change' },
  'scripts/prodReceipt.mjs': { cat: 'test', note: 'receipt generator tier probes — updated for the M12 receipt' },
  'scripts/prodUglyPathAnonymous.mjs': { cat: 'test', note: 'anonymous probe (premium mention) — updated for the M11 matrix' },
  'scripts/prodUglyPathMatrix.mjs': { cat: 'test', note: 'tier probes — updated for the M11 matrix' },

  // ── legitimate non-entitlement concepts (KEPT) ──────────────────────────
  'lib/chat/personas.ts': { cat: 'legitimate-concept', note: 'tier FIELD carries the DISPLAY rank (Legend|Master), never an entitlement — kept, documented' },
  'app/rishis/page.tsx': { cat: 'legitimate-concept', note: 'TIER_COLORS keys are display ranks (Legend|Master)' },
  'lib/chat/registryDisplay.ts': { cat: 'legitimate-concept', note: 'rank strings / formula copy (Listing Premium, PE Premium) / bios (Graham student)' },
  'lib/chat/registry.ts': { cat: 'legitimate-concept', note: 'rank axis = display (kept); access + fnoAccess axes = entitlement (removed in M3)' },
  'lib/chat/prompts.ts': { cat: 'legitimate-concept', note: 'persona prompt copy mentioning student in bio/voice text' },
  'lib/gamification/index.ts': { cat: 'legitimate-concept', note: 'EnlightenmentLevel XP progress names (Seeker/Apprentice/Practitioner/Rishi) — achievement levels, NOT payment tiers' },
  'components/gamification/ProgressBar.tsx': { cat: 'legitimate-concept', note: 'XP level display (EnlightenmentLevel)' },
  'lib/fno/strategyEngine.ts': { cat: 'legitimate-concept', note: 'options premium = price paid for an option (market term)' },
  'components/bonds/BondDetailClient.tsx': { cat: 'legitimate-concept', note: 'bond premium market term' },
  'components/markets/WorldMarketsGrid.tsx': { cat: 'legitimate-concept', note: 'pricing-power market commentary' },
  'components/stock/WisdomSidebar.tsx': { cat: 'legitimate-concept', note: 'pricing-power lesson copy' },
  'lib/scorers/bond/buffett.ts': { cat: 'legitimate-concept', note: 'bond premium valuation term' },
  'lib/scorers/commentary.ts': { cat: 'legitimate-concept', note: 'valuation commentary (premium = valuation concept)' },
  'lib/scorers/commodity/crude.ts': { cat: 'legitimate-concept', note: 'commodity commentary' },
  'lib/scorers/commodity/danielyergin.ts': { cat: 'legitimate-concept', note: 'energy commentary' },
  'lib/scorers/commodity/jimrogers.ts': { cat: 'legitimate-concept', note: 'commodity commentary' },
  'lib/scorers/config.ts': { cat: 'legitimate-concept', note: 'pillar weight labels (premium as valuation concept)' },
  'lib/scorers/graham.ts': { cat: 'legitimate-concept', note: 'margin-of-safety commentary' },
  'lib/scorers/pillars/moat.ts': { cat: 'legitimate-concept', note: 'pricing-power pillar (13 mentions — the moat concept)' },
  'lib/wisdom/graph.ts': { cat: 'legitimate-concept', note: 'wisdom graph copy' },
  'lib/wisdom/parallels.ts': { cat: 'legitimate-concept', note: 'wisdom parallels copy' },
  'lib/wisdom/stockParallels.ts': { cat: 'legitimate-concept', note: 'wisdom parallels copy' },
  'lib/wisdom/universalParallels.ts': { cat: 'legitimate-concept', note: 'wisdom parallels copy' },
  'lib/gurus/crypto.ts': { cat: 'legitimate-concept', note: 'comment describing the (now removed) paid-verdict boundary — comment updated in M3' },
  'data/economyPlus/macroData.ts': { cat: 'legitimate-concept', note: 'macro glossary (pricing power, risk premium)' },
  'data/economyPlus/macroData.bn.ts': { cat: 'legitimate-concept', note: 'macro glossary (locale)' },
  'data/economyPlus/macroData.mr.ts': { cat: 'legitimate-concept', note: 'macro glossary (locale)' },
  'data/economyPlus/macroData.ta.ts': { cat: 'legitimate-concept', note: 'macro glossary (locale)' },
  'data/economyPlus/macroData.te.ts': { cat: 'legitimate-concept', note: 'macro glossary (locale)' },
  'data/glossary.ts': { cat: 'legitimate-concept', note: 'glossary definitions (pricing power)' },
  'data/news/index.ts': { cat: 'legitimate-concept', note: 'seed news copy (rating upgrades)' },
  'data/rishi-portfolios/global-plays.ts': { cat: 'legitimate-concept', note: 'investment thesis copy (pricing power)' },
  'data/stocks/index.ts': { cat: 'legitimate-concept', note: 'comment describing the N1 boundary + Zaggle PREPAID company name' },
  'lib/adapters/stockAdapter.ts': { cat: 'legitimate-concept', note: 'Core pricing field-group comment' },
  'lib/livePrice.ts': { cat: 'legitimate-concept', note: 'live pricing module comment' },
  'lib/types/asset.ts': { cat: 'legitimate-concept', note: 'Core pricing field-group comment' },
  'lib/ai/evidence.ts': { cat: 'legitimate-concept', note: 'provenance ANTI-UPGRADE vocabulary — AI provenance concept, not commerce' },
  'lib/ai/router.ts': { cat: 'legitimate-concept', note: 'anti-upgrade wording rule in the model contract' },
  'lib/ai/schemas.ts': { cat: 'legitimate-concept', note: 'anti-upgrade comment' },
  'scripts/populateSecurityMasterImpl.ts': { cat: 'legitimate-concept', note: 'NSE PAID UP VALUE exchange column name' },
  'app/sitemap.ts': { cat: 'legitimate-concept', note: '/pricing sitemap entry — kept (route remains as the free-access notice)' },
};

// Files that may legitimately contain the vocabulary but are NOT product
// surface: this inventory itself, the audit gate, and the evidence dir.
const SELF = [
  "scripts/freeAccessInventory.mjs",
  "scripts/freeAccessAudit.mjs",
  "docs/evidence/commit-m/free-access-inventory.md",
  "docs/evidence/commit-m/free-access-inventory.json",
];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function scan() {
  const files = trackedFiles().filter(
    (f) =>
      /\.(ts|tsx|js|mjs|mts|json|md|sql|example|txt)$/.test(f) ||
      f === "next.config.js" ||
      f.endsWith(".env.example"),
  );
  const results = [];
  const unclassified = [];
  for (const file of files) {
    if (SELF.includes(file)) continue;
    let text;
    try {
      text = readFileSyncSafe(join(ROOT, file));
    } catch {
      continue;
    }
    if (text === null) continue;
    const hits = {};
    let total = 0;
    for (const [term, { re }] of Object.entries(TERMS)) {
      const n = (text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) ?? []).length;
      if (n > 0) {
        hits[term] = n;
        total += n;
      }
    }
    if (total === 0) continue;
    const cls = CLASSIFY[file];
    if (!cls) {
      unclassified.push({ file, hits });
      continue;
    }
    results.push({ file, category: cls.cat, note: cls.note, hits, total });
  }
  return { results, unclassified };
}

function readFileSyncSafe(p) {
  try {
    return execFileSync("cat", [p], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  } catch {
    return null;
  }
}

const { results, unclassified } = scan();

// group by category
const byCat = {};
for (const r of results) {
  (byCat[r.category] ??= []).push(r);
}

const json = {
  generatedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
  terms: Object.keys(TERMS),
  totalOccurrences: results.reduce((s, r) => s + r.total, 0),
  totalFiles: results.length,
  byCategory: Object.fromEntries(
    Object.entries(byCat).map(([k, v]) => [k, { files: v.length, occurrences: v.reduce((s, r) => s + r.total, 0) }]),
  ),
  files: results,
  unclassified,
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "free-access-inventory.json"), JSON.stringify(json, null, 2) + "\n");

// human-readable markdown
let md = `# Commit M1 — free-access inventory (classified, pre-deletion)\n\n`;
md += `Generated: ${json.generatedAt} · commit \`${json.commit}\` · scanner: \`scripts/freeAccessInventory.mjs\`\n\n`;
md += `Scan vocabulary (Coder Directions §6): ${Object.keys(TERMS).map(t => "`" + t + "`").join(", ")}.\n`;
md += `**${json.totalOccurrences} occurrences across ${json.totalFiles} files.** Every matching file is classified below; an unclassified match fails the scanner.\n\n`;
md += `## Summary by category\n\n| Category | Files | Occurrences | Disposition |\n|---|---|---|---|\n`;
const DISPOSITION = {
  'runtime-entitlement': 'REMOVE the entitlement condition (M3/M5) — feature stays, gate goes',
  'payment-surface': 'RETIRE (M4) — /api/payment 410, dead payment UI/code deleted, records/migrations preserved',
  'ui-copy': 'UPDATE (M4/M6) — honest copy; no upgrade/plan language remains',
  'db-persistence': 'PRESERVE verbatim (historical DB schema / payment records / evidence)',
  'dead-code': 'DELETE (Rule 17) — unused module carrying a tier axis',
  documentation: 'UPDATE (M6) — stale commercial claims removed, FD-7 resolved; historical reports preserved',
  test: 'UPDATE/DELETE with the code under test; fail-first free-access tests added (M2)',
  'legitimate-concept': 'KEEP — display rank, XP level, market terminology, provenance anti-upgrade, auth',
};
for (const [cat, label] of Object.entries(CATEGORIES)) {
  const s = json.byCategory[cat] ?? { files: 0, occurrences: 0 };
  md += `| ${cat} — ${label} | ${s.files} | ${s.occurrences} | ${DISPOSITION[cat]} |\n`;
}
md += `\n## File-by-file classification\n\n`;
for (const [cat, label] of Object.entries(CATEGORIES)) {
  const rows = byCat[cat] ?? [];
  if (rows.length === 0) continue;
  md += `### ${cat} — ${label}\n\n| File | Matched terms | Note |\n|---|---|---|\n`;
  for (const r of rows.sort((a, b) => a.file.localeCompare(b.file))) {
    md += `| \`${r.file}\` | ${Object.entries(r.hits).map(([t, n]) => `${t}×${n}`).join(", ")} | ${r.note} |\n`;
  }
  md += `\n`;
}
if (unclassified.length > 0) {
  md += `## UNCLASSIFIED (scanner failure)\n\n`;
  for (const u of unclassified) md += `- \`${u.file}\`: ${JSON.stringify(u.hits)}\n`;
}
writeFileSync(join(OUT_DIR, "free-access-inventory.md"), md);

console.log(`files=${json.totalFiles} occurrences=${json.totalOccurrences}`);
for (const [cat, s] of Object.entries(json.byCategory)) {
  console.log(`  ${cat}: ${s.files} files / ${s.occurrences} occurrences`);
}
if (unclassified.length > 0) {
  console.error(`\nUNCLASSIFIED matches (${unclassified.length}) — classify before any deletion:`);
  for (const u of unclassified) console.error(`  ${u.file}: ${JSON.stringify(u.hits)}`);
  process.exit(1);
}
console.log("\ninventory complete — every match classified");
