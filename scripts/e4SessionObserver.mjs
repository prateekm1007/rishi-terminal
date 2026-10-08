// E4 session observer (round 24→25) — read-only NSE-session acceptance battery.
//
// Purpose: pre-registered, repository-controlled measurement of the E4
// freshness acceptance against the CURRENT universe (896 after #239/#242/
// #243), per the founder's round-24 directive 4:
//   - scheduled in-session execution (pg_cron job `quotes-warm`, no manual
//     dispatch as the acceptance mechanism),
//   - freshness threshold >= ceil(0.9 * universe) over the 30-minute window,
//   - /api/health agreement with the SQL count,
//   - provider-missing classification (unavailable stays UNAVAILABLE),
//   - formerly-aliased + never-aliased + unavailable positive controls,
//   - G6 no-op proof: pre-open scheduled fires log NOTHING (ingestion_log
//     count unchanged until the first in-session run).
//
// Design notes (Constitution C5/C10):
//   - READ-ONLY: reads /api/version, /api/health, POSTs /api/prices/batch
//     (the page's own read path), and runs read-only SQL through the
//     Supabase Management API query endpoint. It NEVER dispatches the warmer
//     and never writes production data.
//   - Retroactively safe: every input (cron.job_run_details, ingestion_log,
//     quote_cache state) is durable — if the process dies, relaunching
//     resumes from the state file and the acceptance can still be completed.
//   - Resume-safe: state is an append-only JSONL (state.jsonl) plus the last
//     seen pg_cron runid; duplicate reads are idempotent.
//
// Usage (sandbox/CI, secrets via env — never in the repo):
//   SUPABASE_MGMT_PAT=... SUPABASE_PROJECT_REF=... \
//     node scripts/e4SessionObserver.mjs --out /home/z/my-project/e4-r25
//
// The acceptance battery fires automatically once >= 3 consecutive
// in-session SUCCEEDED pg_cron runs have been observed; a second battery
// runs at the late-session mark (~09:45 UTC). The process exits after the
// configured --until hour (default 10:30 UTC) on a weekday.

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
};
const HERE = dirname(fileURLToPath(import.meta.url));
// --repo lets a sandbox-side copy run against the repository without
// being committed into whatever branch is checked out there.
const REPO = argOf("--repo", join(HERE, ".."));

// Import-safe main guard: unit tests import the pure exports without
// triggering the CLI/env checks or the polling loop.
const IS_MAIN =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

const OUT_DIR = argOf("--out", join(REPO, "scripts", "e4-observer"));
const INTERVAL_S = Number(argOf("--interval", 240));
const RUN_HOURS = Number(argOf("--hours", 21)); // runtime cap; covers launch -> next session close
const ONCE = argv.includes("--once"); // one poll cycle then exit (smoke/CI)
const PAT = process.env.SUPABASE_MGMT_PAT;
const REF = process.env.SUPABASE_PROJECT_REF;
const BASE = "https://rishi-terminal.vercel.app";
if (!IS_MAIN) {
  // imported as a module (tests) — nothing to do; exports below.
} else if (!PAT || !REF) {
  console.error("missing SUPABASE_MGMT_PAT / SUPABASE_PROJECT_REF env");
  process.exit(2);
}

// ── universe (896 keys, extracted deterministically from the registry) ─────
// The U2 batch contract (6b02dd3): POST /api/prices/batch takes
// {"symbols": [...]} — a bare JSON array is rejected with HTTP 400
// "symbols array required". The 2026-10-08 04:29 early battery swept all
// 896 symbols into 'unavailable' because this instrument still sent the
// pre-U2 bare-array body; an instrument failure must fail LOUDLY, never
// masquerade as a data state.
export function batchPricesRequestBody(symbols) {
  return JSON.stringify({ symbols });
}

export function extractUniverseKeys(stocksSource) {
  const keys = [];
  // One entry per STOCKS record: `  "KEY": { symbol: "KEY" ...` (2-space
  // indent, any non-quote key characters — J&KBANK, M&M, M&MFIN).
  const re = /^ {2}"([^"]+)": \{ symbol: "/gm;
  let m;
  while ((m = re.exec(stocksSource)) !== null) keys.push(m[1]);
  return keys;
}
const UNIVERSE = extractUniverseKeys(
  readFileSync(join(REPO, "data", "stocks", "index.ts"), "utf8"),
);
if (UNIVERSE.length < 500) {
  console.error(`universe extraction suspicious: ${UNIVERSE.length} keys`);
  process.exit(2);
}
const TARGET_FRESH = Math.ceil(0.9 * UNIVERSE.length);

// ── session window (IST 09:15-15:30 = UTC 03:45-10:00, Mon-Fri) ───────────
export function nseSessionOpenAt(d) {
  const day = d.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const t = d.getUTCHours() * 60 + d.getUTCMinutes();
  return t >= 225 && t < 600; // 03:45 UTC .. 10:00 UTC
}

// ── read-only SQL through the Supabase Management API ─────────────────────
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function getJson(url, opts) {
  const r = await fetch(url, { cache: "no-store", ...opts });
  return { status: r.status, body: await r.json() };
}

// ── resume state ───────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const STATE_FILE = join(OUT_DIR, "state.jsonl");
function record(kind, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), kind, ...data });
  appendFileSync(STATE_FILE, line + "\n");
  console.log(line.slice(0, 300));
}

let lastRunid = 0;
if (existsSync(STATE_FILE)) {
  for (const line of readFileSync(STATE_FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const s = JSON.parse(line);
      if (s.kind === "cron-runs") for (const r of s.runs) lastRunid = Math.max(lastRunid, r.runid);
    } catch { /* torn tail line — ignore */ }
  }
}
let batteryDone = false;
let lateBatteryDone = false;

// ── the acceptance battery (read-only) ─────────────────────────────────────
async function runBattery(label) {
  const t0 = Date.now();
  // 1) SQL freshness — universe-scoped 30-minute window (the pre-registered
  //    §4 form) + the raw quote_cache count + ingestion_log state.
  const universeList = "('" + UNIVERSE.join("','") + "')";
  const [universeFresh, rawFresh, ingest] = await Promise.all([
    sql(`select count(*)::int as n from quote_cache where symbol in ${universeList} and observed_at > now() - interval '30 minutes'`),
    sql(`select count(*)::int as n from quote_cache where observed_at > now() - interval '30 minutes'`),
    sql(`select count(*)::int as n, max(finished_at) as last from ingestion_log where job_name = 'quotes_warm'`),
  ]);
  // 2) /api/health — the agreement surface.
  const health = await getJson(`${BASE}/api/health`);
  const version = await getJson(`${BASE}/api/version`);
  const hc = health.body?.quoteCache?.equities ?? {};
  const agreement = hc.fresh === universeFresh[0].n && hc.total === UNIVERSE.length;
  // 3) Controls through the page's own transport (batch path, 50-chunks).
  const controls = {};
  const controlSyms = [
    "BANKBARODA", // positive control (round-22 precedent)
    "RELIANCE", "TCS", // never aliased
    "BAJAJAUTO", "AMARAJABAT", "MEGH", "NARAYANA", "SONATASOFT", // formerly aliased (LP3)
    // the #242 nine: registry keys served through round-24 provider aliases
    "BRAINBEES", "GANESHHOUC", "SOMDISTILL", "TECHNO", "SANDUMANG", "ELDECO", "JSLHISAR", "LAXMIMACH", "NAMINDIA",
    "LTIM", "CENTURYTEX", // honest-unavailable class
  ];
  for (let i = 0; i < controlSyms.length; i += 50) {
    const chunk = controlSyms.slice(i, i + 50);
    const r = await getJson(`${BASE}/api/prices/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: batchPricesRequestBody(chunk),
    });
    if (!r.body?.prices) {
      throw new Error(
        `controls batch: HTTP ${r.status} without a prices object (endpoint contract?) - refusing to record ${chunk.length} 'unavailable' rows from an instrument failure`,
      );
    }
    for (const [sym, q] of Object.entries(r.body?.prices ?? {})) {
      controls[sym] = {
        status: q.status,
        price: q.price ?? null,
        observedAt: q.observedAt ?? null,
        source: q.source ?? null,
      };
    }
  }
  // 4) Full-universe availability sweep (the census methodology): count
  //    unavailable + fresh; classify provider-missing as the batch-miss set.
  const unavailable = [];
  const priced = { live: 0, cached: 0 };
  let freshServed = 0;
  for (let i = 0; i < UNIVERSE.length; i += 50) {
    const chunk = UNIVERSE.slice(i, i + 50);
    const r = await getJson(`${BASE}/api/prices/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: batchPricesRequestBody(chunk),
    });
    if (!r.body?.prices) {
      throw new Error(
        `sweep batch: HTTP ${r.status} without a prices object (endpoint contract?) - refusing to record ${chunk.length} 'unavailable' rows from an instrument failure`,
      );
    }
    for (const sym of chunk) {
      const q = r.body?.prices?.[sym];
      if (!q || q.price == null || q.status === "UNAVAILABLE") {
        unavailable.push(sym);
        continue;
      }
      if (q.status === "LIVE") priced.live++;
      else priced.cached++;
      if (q.observedAt && Date.now() - Date.parse(q.observedAt) < 30 * 60 * 1000) freshServed++;
    }
    // Respect the endpoint's 60 req/min per-IP rate limit.
    await new Promise((r2) => setTimeout(r2, 1200));
  }
  const verdict = {
    label,
    at: new Date().toISOString(),
    version: version.body,
    threshold: { universe: UNIVERSE.length, targetFresh: TARGET_FRESH },
    sqlUniverseFresh: universeFresh[0].n,
    sqlRawFresh: rawFresh[0].n,
    healthEquities: hc,
    healthAgreement: agreement,
    lastPriceIngestAt: health.body?.lastPriceIngestAt ?? null,
    healthReasons: health.body?.reasons ?? [],
    ingestionLog: ingest[0],
    controls,
    sweep: {
      priced,
      freshServed,
      unavailable,
      unavailableCount: unavailable.length,
    },
    pass: {
      freshness: universeFresh[0].n >= TARGET_FRESH,
      healthAgreement: agreement,
      bankbarodaFresh:
        controls.BANKBARODA?.price != null &&
        controls.BANKBARODA?.observedAt != null &&
        Date.now() - Date.parse(controls.BANKBARODA.observedAt) < 30 * 60 * 1000,
      unavailableHonest:
        controls.LTIM?.status === "UNAVAILABLE" && controls.CENTURYTEX?.status === "UNAVAILABLE",
    },
    wallMs: Date.now() - t0,
  };
  writeFileSync(join(OUT_DIR, `battery-${label}.json`), JSON.stringify(verdict, null, 1));
  record("battery", {
    label,
    pass: verdict.pass,
    sqlUniverseFresh: verdict.sqlUniverseFresh,
    target: TARGET_FRESH,
    unavailableCount: verdict.sweep.unavailableCount,
  });
  return verdict;
}

// ── main loop ──────────────────────────────────────────────────────────────
async function main() {
const START_MS = Date.now();
console.log(
  `E4 observer: universe=${UNIVERSE.length} targetFresh=${TARGET_FRESH} out=${OUT_DIR} interval=${INTERVAL_S}s hours=${RUN_HOURS} lastRunid=${lastRunid}`,
);

for (;;) {
  const now = new Date();
  if (!ONCE && Date.now() - START_MS > RUN_HOURS * 3600_000) {
    console.log("runtime cap reached — exiting");
    break;
  }
  try {
    // version + health every poll
    const [version, health] = await Promise.all([
      getJson(`${BASE}/api/version`),
      getJson(`${BASE}/api/health`),
    ]);
    record("poll", {
      sha: version.body?.sha ?? null,
      status: health.body?.status ?? null,
      fresh: health.body?.quoteCache?.equities?.fresh ?? null,
      total: health.body?.quoteCache?.equities?.total ?? null,
      lastPriceIngestAt: health.body?.lastPriceIngestAt ?? null,
      reasons: health.body?.reasons ?? [],
    });
    // new pg_cron runs (job `quotes-warm`)
    const runs = await sql(
      `select runid, status, to_char(start_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') as start_utc, ` +
        `to_char(end_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') as end_utc, ` +
        `left(return_message, 200) as return_message ` +
        `from cron.job_run_details where runid > ${lastRunid} and jobid = (select jobid from cron.job where jobname = 'quotes-warm') order by runid`,
    );
    if (runs.length > 0) {
      for (const r of runs) lastRunid = Math.max(lastRunid, r.runid);
      record("cron-runs", { runs });
    }
    // ingestion_log tail (G6 no-op proof: the count must NOT grow on
    // pre-open no-op fires)
    const ingest = await sql(
      `select count(*)::int as n, max(finished_at) as last from ingestion_log where job_name = 'quotes_warm'`,
    );
    record("ingestion", { n: ingest[0].n, last: ingest[0].last });

    // battery triggers
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const inSessionRuns = await sql(
      `select count(*)::int as n from cron.job_run_details ` +
        `where jobid = (select jobid from cron.job where jobname = 'quotes-warm') ` +
        `and status = 'succeeded' and start_time at time zone 'UTC' between ` +
        `(current_date + interval '3 hours 45 minutes') and (current_date + interval '10 hours')`,
    );
    const n = inSessionRuns[0].n;
    if (!batteryDone && n >= 3 && nseSessionOpenAt(now)) {
      batteryDone = true;
      await runBattery("early");
    }
    if (!lateBatteryDone && utcHour >= 9.7 && nseSessionOpenAt(now)) {
      lateBatteryDone = true;
      await runBattery("late");
    }
  } catch (e) {
    record("error", { message: String(e).slice(0, 300) });
  }
  if (ONCE) {
    console.log("--once: single cycle complete — exiting");
    break;
  }
  await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
}
}

if (IS_MAIN) {
  main().catch((e) => {
    console.error("observer crashed:", e);
    process.exit(1);
  });
}
