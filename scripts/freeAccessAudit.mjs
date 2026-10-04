#!/usr/bin/env node
// scripts/freeAccessAudit.mjs — Commit M5 (Coder Directions §14).
//
// THE CANONICAL FREE-ACCESS INVARIANT GATE.
//
// Founder decision 2026-10-02: every product feature is free — no tiers,
// no paid gates, no checkout. This gate FAILS (exit 1) if any
// PRODUCT-ACCESS dependency remains on a tier concept or the retired
// payment surface.
//
// Not a naive grep:
//   - comments are STRIPPED before matching (documentation may honestly
//     describe what was retired; a string literal in code may not);
//   - the vocabulary is ENTITLEMENT-SPECIFIC (gate function names, tier
//     VALUE literals in code, entitlement reads like user.tier, checkout
//     identifiers) — display ranks (Legend|Master), gamification XP
//     levels ("Seeker" capitalized), options 'premium' market terms and
//     locale prose are NOT matched;
//   - LEGACY PERSISTENCE is distinguished from CURRENT PRODUCT ENTITLEMENT
//     by an explicit, per-file, documented allowlist below: database
//     migrations and historical evidence are scanned and exempted with
//     reasons; everything else fails.
//
// Rule 24 (bite proof): introducing a scratch violation fails this gate —
// demonstrated in docs/evidence/commit-m/m5-gate-bite-proof.txt and on a
// scratch CI branch.
//
// Wire into CI: package.json -> "freeAccessAudit"; .github/workflows/ci.yml
// runs it in the main job before the build.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function dirname(p) { return p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"))); }

// ── 1. what is PRODUCT CODE (scanned) ─────────────────────────────────────
const PRODUCT_SCOPES = ["app", "lib", "components", "hooks", "messages", "data"];
const PRODUCT_FILES = ["proxy.ts", "next.config.ts", "next.config.js", "package.json"]; // .ts is canonical (Z5); .js kept for safety if reverted
const PRODUCT_EXTS = /\.(ts|tsx|js|mjs|mts|json)$/;

// ── 2. forbidden patterns (matched against COMMENT-STRIPPED code) ────────
// id: stable identifier used by the allowlist and the reports.
const PATTERNS = [
  { id: "TIER_MODEL", re: /\b(TIER_CONFIG|WisdomTier|TIER_PRICES)\b/, why: "the tier model itself must not exist in product code" },
  { id: "TIER_PREDICATE", re: /\b(isPremium|isDisciple|canAccess|canViewStock|getRishisVisible|getRishisByTier|isPersonaAllowed|startRazorpayCheckout)\s*\(/, why: "tier gate functions must not be called (or defined and called)" },
  { id: "TIER_VALUE_LITERAL", re: /['"](seeker|student|disciple)['"]/, why: "a tier VALUE literal in code is an entitlement decision" },
  { id: "TIER_ENTITLEMENT_READ", re: /\b(user|session|caller|req)\.tier\b|\.tier\s*(===|!==)\s*['"]/, why: "reading a tier from the session/request to decide anything" },
  { id: "TIER_QUOTA_TABLE", re: /\bDAILY_QUOTA\s*[:=]\s*\{|\bDAILY_QUOTA\s*\[/, why: "a quota keyed by tier" },
  { id: "TIER_EXPIRY", re: /\btierExpiresAt\b|\btier_expires_at\b/, why: "tier expiry is historical persistence, not product policy" },
  { id: "PAYMENT_PROCESSOR", re: /razorpay/i, why: "the payment processor is retired — no origin, SDK, env or identifier may return" },
  { id: "PAYMENT_GRANT", re: /\bgrant_tier_for_payment\b|\bgrantTierForPayment\b/, why: "no code path may grant a product entitlement" },
  { id: "PAID_GATE_LANGUAGE", re: /\b(isPaid|paidTier|premiumTier|paidFeature)\b/, why: "paid-gate vocabulary in code" },
];

// ── 3. allowlist: LEGACY PERSISTENCE + documented exemptions ─────────────
// Each entry: { files: [glob-ish], ids: [pattern ids] | "*", reason }
// An allowlisted match is REPORTED but does not fail. A match outside the
// allowlist FAILS. Keep reasons honest — they are the audit trail.
const ALLOWLIST = [
  {
    files: ["lib/db/migrations/*"],
    ids: "*",
    reason:
      "LEGACY PERSISTENCE (Coder Directions §12): historical schema (users.tier, tier_expires_at, transactions.tier_purchased) and the settlement RPC grant_tier_for_payment. Rows and migrations are preserved verbatim; they grant nothing because no product code reads them.",
  },
  {
    files: ["lib/chat/registry.ts"],
    ids: [],
    reason:
      "The registry's header comment documents the REMOVED access/fnoAccess axes (history). Comments are stripped before matching, so no pattern ids need exemption here; the entry exists to record that the display `rank` axis (Legend|Master) is marketing, never an entitlement.",
  },
  {
    files: ["app/privacy/page.tsx"],
    ids: ["PAYMENT_PROCESSOR"],
    reason:
      "LEGAL DISCLOSURE (not product code coupling): the privacy policy names the FORMER payment processor because users who paid in 2026 are owed the fact of who handled their card data. Rendered prose only — no origin, SDK, env read, or checkout invocation; grants nothing.",
  },
];

// Files whose EXISTENCE would itself be a violation (Rule 17: deleted
// surfaces must stay deleted).
const MUST_NOT_EXIST = [
  { path: "lib/premium.ts", why: "the tier model module (TIER_CONFIG + stock-view counter)" },
  { path: "hooks/useTier.ts", why: "client tier state (superseded by hooks/useSession.ts)" },
  { path: "lib/payments/grantTier.ts", why: "the grant RPC wrapper" },
  { path: "lib/payments/signatures.ts", why: "payment signature verification" },
  { path: "components/premium/PaymentButton.tsx", why: "Razorpay checkout UI" },
  { path: "components/premium/UpgradePrompt.tsx", why: "upgrade modal" },
  { path: "lib/fno/rishiPrompts.ts", why: "dead tier-gated F&O prompt module" },
];

// ── helpers ────────────────────────────────────────────────────────────────
import { readdirSync, statSync } from "node:fs";

/** Filesystem walk (NOT git ls-files): untracked/new files are covered
 *  too — a tier gate must fail the audit BEFORE it is ever committed
 *  (Rule 24 bite proof relies on this). node_modules/.next/.git and
 *  non-product directories are skipped by the scope filter. */
function walkProductFiles() {
  const out = [];
  const skipDirs = new Set(["node_modules", ".next", ".git", ".vercel", "coverage"]);
  const rec = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        rec(abs);
      } else if (entry.isFile() && PRODUCT_EXTS.test(entry.name)) {
        const rel = abs.slice(ROOT.length + 1).split("\\").join("/");
        if (inScope(rel)) out.push(rel);
      }
    }
  };
  for (const scope of PRODUCT_SCOPES) rec(join(ROOT, scope));
  for (const f of PRODUCT_FILES) {
    if (existsSync(join(ROOT, f))) out.push(f);
  }
  return out;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

function inScope(file) {
  if (PRODUCT_FILES.includes(file)) return true;
  const top = file.split("/")[0];
  return PRODUCT_SCOPES.includes(top) && PRODUCT_EXTS.test(file);
}

function allowlisted(file, id) {
  return ALLOWLIST.some(
    (a) =>
      (a.ids === "*" || a.ids.includes(id)) &&
      a.files.some((f) => {
        const base = f.replace(/\*$/, "");
        return file.startsWith(base);
      }),
  );
}

function allowReason(file) {
  const entry = ALLOWLIST.find((a) => a.files.some((f) => file.startsWith(f.replace(/\*$/, ""))));
  return entry?.reason ?? "";
}

// ── scan ───────────────────────────────────────────────────────────────────
const files = walkProductFiles().sort();
const violations = [];
const allowed = [];

for (const file of files) {
  let raw;
  try {
    raw = readFileSync(join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  const code = stripComments(raw);
  const lines = code.split("\n");
  for (const { id, re, why } of PATTERNS) {
    const matcher = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = matcher.exec(code)) !== null) {
      const lineNo = code.slice(0, m.index).split("\n").length;
      const snippet = (lines[lineNo - 1] ?? "").trim().slice(0, 120);
      const hit = { file, id, line: lineNo, snippet, why };
      if (allowlisted(file, id)) allowed.push({ ...hit, reason: allowReason(file) });
      else violations.push(hit);
    }
  }
}

const resurrected = MUST_NOT_EXIST.filter((x) => existsSync(join(ROOT, x.path)));

// ── report ─────────────────────────────────────────────────────────────────
console.log(`freeAccessAudit: scanned ${files.length} product files (${PRODUCT_SCOPES.join(", ")}, ${PRODUCT_FILES.join(", ")})`);
if (allowed.length > 0) {
  console.log(`\nallowlisted legacy persistence (documented, non-failing): ${allowed.length}`);
  for (const a of allowed) {
    console.log(`  [ok-legacy] ${a.file}:${a.line} (${a.id}) — ${a.reason.slice(0, 100)}…`);
  }
}
if (violations.length > 0) {
  console.error(`\nVIOLATIONS: product code still depends on a tier/payment concept (${violations.length})`);
  for (const v of violations) {
    console.error(`  [${v.id}] ${v.file}:${v.line}: ${v.snippet}`);
    console.error(`      -> ${v.why}`);
  }
}
if (resurrected.length > 0) {
  console.error(`\nRESURRECTED SURFACES (Rule 17 — deleted code must stay deleted): ${resurrected.length}`);
  for (const r of resurrected) console.error(`  [resurrected] ${r.path} — ${r.why}`);
}

if (violations.length > 0 || resurrected.length > 0) {
  console.error("\nfreeAccessAudit: FAIL — every feature must be free; see the violations above.");
  process.exit(1);
}
console.log("\nfreeAccessAudit: PASS — no product-access dependency on tiers or payments.");
