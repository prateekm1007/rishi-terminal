/**
 * R4-06 (Round 15 B7): i18n catalog coverage gate.
 *
 * Roadmap acceptance (verbatim):
 *   npx tsx scripts/i18nCoverage.ts --locale=hi
 *   # -> 100% of core-flow keys translated, 0 missing
 *
 * Measures a locale catalog against the English source of truth
 * (messages/en.json) on the FLATTENED dot-path key set:
 *   - missing  — keys present in en but absent from the locale (a missing
 *     key silently falls back to English at runtime — the user sees a
 *     mixed-language page);
 *   - empty    — present but '' (renders as nothing — worse than fallback);
 *   - orphans  — keys present in the locale but NOT in en (stale debt;
 *     e.g. translator notes that leaked in).
 *
 * CORE-FLOW namespaces: the primary user journey. Hindi must be complete
 * here before any other locale is extended (roadmap: "Hindi complete for
 * core flows before adding others"). The gate FAILS on any missing/empty
 * key in the audited locale (core or not) and on orphans — "0 missing"
 * is the acceptance, with the core subset reported explicitly.
 *
 * Usage:
 *   npx tsx scripts/i18nCoverage.ts --locale=hi
 *   npx tsx scripts/i18nCoverage.ts --locale=hi --core-only
 *   npx tsx scripts/i18nCoverage.ts --all
 *
 * Exit codes: 0 = coverage complete, 1 = gaps found, 2 = usage error.
 */

import { readFileSync, existsSync } from 'node:fs';
import { flatten } from '../lib/i18n/flatten';
import { CORE_NAMESPACES } from '../lib/i18n/coreNamespaces';

interface Args {
  locale: string | null;
  all: boolean;
  coreOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { locale: null, all: false, coreOnly: false };
  // Accept both `--locale=hi` (the roadmap's acceptance form) and
  // `--locale hi`.
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a === '--locale') args.locale = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--core-only') args.coreOnly = true;
    else {
      console.error(`i18n-coverage: unknown argument '${a}'`);
      process.exit(2);
    }
  }
  if (!args.all && !args.locale) {
    console.error('i18n-coverage: pass --locale <code> or --all');
    process.exit(2);
  }
  return args;
}

function loadCatalog(path: string): Record<string, string> {
  if (!existsSync(path)) {
    console.error(`i18n-coverage: ${path} not found`);
    process.exit(2);
  }
  // JSON import via readFileSync + JSON.parse keeps this script free of
  // TS path-mapping concerns (mirrors scripts/bundleBudget.ts).
  return flatten(JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>);
}

interface Report {
  locale: string;
  total: number;
  translated: number;
  missing: string[];
  empty: string[];
  orphans: string[];
  coreMissing: string[];
  coreTotal: number;
  coreTranslated: number;
}

function audit(locale: string, coreOnly: boolean): Report {
  const en = loadCatalog('messages/en.json');
  const target = loadCatalog(`messages/${locale}.json`);
  const isCore = (key: string) => CORE_NAMESPACES.includes(key.split('.')[0]);

  const missing = Object.keys(en).filter((k) => !(k in target));
  const empty = Object.keys(en).filter((k) => k in target && (target[k] === '' || target[k] == null));
  const orphans = Object.keys(target).filter((k) => !(k in en));

  const coreKeys = coreOnly
    ? Object.keys(en).filter(isCore)
    : Object.keys(en).filter(isCore);
  const coreMissing = missing.concat(empty).filter(isCore);
  const coreTotal = coreKeys.length;
  const coreTranslated = coreTotal - coreMissing.length;

  return {
    locale,
    total: Object.keys(en).length,
    translated: Object.keys(en).length - missing.length - empty.length,
    missing,
    empty,
    orphans,
    coreMissing,
    coreTotal,
    coreTranslated,
  };
}

function printReport(r: Report, coreOnly: boolean): boolean {
  const corePct = r.coreTotal === 0 ? 100 : (r.coreTranslated / r.coreTotal) * 100;
  const totalPct = (r.translated / r.total) * 100;
  const ok = r.missing.length === 0 && r.empty.length === 0 && r.orphans.length === 0;

  console.log(`── i18n coverage: ${r.locale} ──`);
  console.log(
    `core-flow ( ${CORE_NAMESPACES.join(', ')} ): ${r.coreTranslated}/${r.coreTotal} keys (${corePct.toFixed(1)}%)`,
  );
  if (!coreOnly) {
    console.log(`all namespaces:                    ${r.translated}/${r.total} keys (${totalPct.toFixed(1)}%)`);
  }
  if (r.missing.length > 0) {
    console.log(`missing keys (${r.missing.length}):`);
    for (const k of r.missing.slice(0, 30)) console.log(`  - ${k}`);
    if (r.missing.length > 30) console.log(`  … and ${r.missing.length - 30} more`);
  }
  if (r.empty.length > 0) {
    console.log(`empty keys (${r.empty.length}):`);
    for (const k of r.empty.slice(0, 30)) console.log(`  - ${k}`);
  }
  if (r.orphans.length > 0) {
    console.log(`orphan keys — in ${r.locale} but not in en (${r.orphans.length}):`);
    for (const k of r.orphans.slice(0, 30)) console.log(`  - ${k}`);
  }
  console.log(
    ok
      ? `i18n-coverage: ${r.locale} — 100% of core-flow keys translated, 0 missing`
      : `i18n-coverage: ${r.locale} — GAPS (${r.missing.length} missing, ${r.empty.length} empty, ${r.orphans.length} orphans)`,
  );
  return ok;
}

const args = parseArgs(process.argv.slice(2));

if (args.all) {
  // Audits every catalog the app actually ships (lib/language.tsx locale
  // list) — gu.json exists on disk but is NOT a supported locale and is
  // reported separately as a finding, not audited as one.
  const locales = ['hi', 'bn', 'mr', 'te', 'ta'];
  let allOk = true;
  const reports = locales.map((l) => audit(l, args.coreOnly));
  for (const r of reports) {
    if (!printReport(r, args.coreOnly)) allOk = false;
  }
  if (existsSync('messages/gu.json')) {
    console.log(
      'note: messages/gu.json exists but gu is NOT in the supported locale list (lib/language.tsx) — see the round evidence; founder decision pending on the sixth regional catalog.',
    );
  }
  process.exit(allOk ? 0 : 1);
} else {
  const r = audit(args.locale!, args.coreOnly);
  process.exit(printReport(r, args.coreOnly) ? 0 : 1);
}
