/**
 * checkEnv.ts (P0-03) — verify every variable the app can read is present
 * for the target environment.
 *
 * - Names only. This script never prints or logs values (Constitution art. 1:
 *   an audit tool that echoes secrets is itself a leak).
 * - Variable NAMES come from .env.example, so the template and the check
 *   cannot drift apart.
 * - Required-per-environment matrix lives here; entries marked PROPOSED are
 *   defaults the founder should confirm (Roadmap rule).
 *
 * Usage:
 *   npx tsx scripts/checkEnv.ts --env=staging
 *   npx tsx scripts/checkEnv.ts --env=production
 *   npx tsx scripts/checkEnv.ts --env=development [--env-file=.env.local]
 *
 * Values are read from process.env, optionally merged from --env-file (a
 * plain KEY=VALUE file, e.g. a Vercel-pulled env or .env.staging).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type EnvName = "development" | "staging" | "production";

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
}

const env = (arg("env") ?? "development") as EnvName;
if (!["development", "staging", "production"].includes(env)) {
  console.error(`Unknown env "${env}" — use development | staging | production`);
  process.exit(2);
}

// ── Parse variable names from .env.example (names only, by design) ──
const examplePath = join(process.cwd(), ".env.example");
const exampleNames = existsSync(examplePath)
  ? readFileSync(examplePath, "utf8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#") && l.includes("="))
      .map(l => l.split("=")[0].trim())
  : [];

if (exampleNames.length === 0) {
  console.error("BLOCKED: .env.example missing or empty — cannot know what to check");
  process.exit(2);
}

// ── Required-per-environment matrix ────────────────────────────────
// PROPOSED matrix (P0-03 default; founder to confirm via E6-09/FD-7):
//  - development: Supabase public pair only; everything else optional.
//  - staging: full server stack (cron, chat) but payments stay OFF until
//    Razorpay staging keys exist, so RAZORPAY_* are WARN there.
//  - production: everything the app reads is required.
const REQUIRED: Record<EnvName, string[]> = {
  development: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  staging: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "CHAT_API_BASE_URL",
    "CHAT_API_KEY",
  ],
  production: [
    ...exampleNames, // every variable the app can read is required in prod
  ],
};

const WARN_ONLY: Record<EnvName, string[]> = {
  development: [],
  staging: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "FMP_API_KEY", "FINNHUB_API_KEY"],
  production: [],
};

// ── Optional plain KEY=VALUE file merged into process.env ──
const envFile = arg("env-file");
if (envFile) {
  if (!existsSync(envFile)) {
    console.error(`BLOCKED: --env-file=${envFile} does not exist`);
    process.exit(2);
  }
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const key = t.replace(/^export\s+/, "").split("=")[0].trim();
    // Presence check only — we deliberately do NOT keep the value.
    if (!(key in process.env)) (process.env as Record<string, string>)[key] = "(present)";
  }
}

// ── Check presence (never values) ──
const present = (name: string) =>
  name in process.env &&
  String(process.env[name] ?? "").trim().length > 0 &&
  !String(process.env[name]).includes("placeholder");

const missingRequired = REQUIRED[env].filter(n => !present(n));
const missingWarn = WARN_ONLY[env].filter(n => !present(n));
const unknownButSet = Object.keys(process.env).filter(
  k => !exampleNames.includes(k) &&
    (k.startsWith("NEXT_PUBLIC_") || k.endsWith("_KEY") || k.endsWith("_SECRET") || k.endsWith("_URL")),
);

console.log(`── checkEnv: ${env} ──`);
console.log(`Variables declared in .env.example: ${exampleNames.length}`);

let failed = false;
if (missingRequired.length > 0) {
  failed = true;
  console.log(`MISSING (required in ${env}):`);
  for (const n of missingRequired) console.log(`  ✗ ${n}`);
} else {
  console.log(`All ${REQUIRED[env].length} required variables present.`);
}
if (missingWarn.length > 0) {
  console.log(`MISSING (warn-only in ${env} — features will be degraded):`);
  for (const n of missingWarn) console.log(`  ! ${n}`);
}
if (unknownButSet.length > 0) {
  console.log(`Set but NOT declared in .env.example (update the template or rename):`);
  for (const n of unknownButSet) console.log(`  ? ${n}`);
}

process.exit(failed ? 1 : 0);
