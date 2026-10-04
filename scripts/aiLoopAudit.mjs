// scripts/aiLoopAudit.mjs — Commit M CI architecture gate (founder §29).
//
// Statically verifies the invariants of the unified end-to-end AI pipeline:
//   1. no client code imports server-only AI/tools/evidence modules;
//   2. no provider SDK / direct provider URL outside the AI abstraction;
//   3. no model-supplied tool results enter evidence (only executeAiTool
//      produces tool evidence; the router consumes outcome.evidence only);
//   4. no client-supplied evidence enters grounding (validateGrounding is
//      fed only server-assembled/tool evidence; history is transcript only);
//   5. no financial request returns raw unstructured provider output
//      (the router has no `answer: <raw text>` path in ANY branch);
//   6. no AI-side score calculation duplicates the scoring engine
//      (the tool layer consumes buildScoreItem; it never imports scoring);
//   7. every approved tool is registered in exactly ONE allowlist;
//   8. tool arguments are STRICT zod contracts.
//
// Usage: node scripts/aiLoopAudit.mjs   → exit 0 clean / 1 violations.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const violations = [];
function check(ok, id, detail) {
  if (!ok) violations.push({ id, detail });
}
function checkNot(re, haystack, id, detail) {
  const m = haystack.match(re);
  check(!m, id, `${detail} → ${m ? JSON.stringify(m[0]) : ""}`);
}
function checkYes(re, haystack, id, detail) {
  check(re.test(haystack), id, detail);
}

// ── 1. client code never imports server-only AI modules ────────────────
const SERVER_ONLY_MODULES = [
  "lib/ai/tools",
  "lib/ai/evidence",
  "lib/ai/router",
  "lib/ai/providers",
  "lib/fno/rishiPrompts",
  "lib/chat/personaAccess",
];
function walkClientFiles(dir) {
  let out = [];
  let entries;
  try {
    entries = execSync(`git ls-files "${dir}"`, { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    entries = [];
  }
  for (const f of entries) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    let src;
    try {
      src = read(f);
    } catch {
      continue;
    }
    const isClient = /^\s*['"]use client['"]/m.test(src);
    if (isClient) out.push({ file: f, src });
  }
  return out;
}
for (const dir of ["app", "components", "hooks"]) {
  for (const { file, src } of walkClientFiles(dir)) {
    for (const mod of SERVER_ONLY_MODULES) {
      const re = new RegExp(`from\\s+['"][^'']*${mod.replace(/\//g, "\\/")}['"]|import\\(['"][^'']*${mod.replace(/\//g, "\\/")}['"]\\)`);
      const m = src.match(re);
      check(!m, "client-imports-server-ai", `${file} imports server-only module ${mod}`);
    }
  }
}

// ── 2. provider SDK / direct provider URL outside lib/ai ───────────────
const tracked = execSync("git ls-files", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean);
const PROVIDER_URL_RE = /generativelanguage\.googleapis\.com|api\.openai\.com|api\.razorpay\.com|apihub\.agnes-ai\.com/;
for (const f of tracked) {
  if (!/\.(ts|tsx|mjs)$/.test(f)) continue;
  if (f.startsWith("lib/ai/")) continue; // THE provider boundary
  // The approved provider REGISTRY names provider endpoints as data (its
  // whole purpose) — that is not an embedding.
  if (f.startsWith("scripts/") || f.startsWith("docs/") || f.startsWith("test/")) continue; // tooling/evidence may name URLs
  if (f === "lib/registry/providerRegistry.ts") continue;
  // next.config.ts names provider endpoints ONLY inside the CSP
  // connect-src allowlist — a security-header listing, not an embedding
  // (the pre-Z5 next.config.js was never scanned only because the scan
  // matches .ts/.tsx/.mjs; the exemption documents the same reality).
  if (f === "next.config.ts") continue;
  if (f.startsWith(".env")) continue;
  let src;
  try {
    src = read(f);
  } catch {
    continue;
  }
  const m = src.match(PROVIDER_URL_RE);
  check(!m, "provider-url-outside-ai-abstraction", `${f} embeds a provider endpoint`);
}

const routerSrc = read("lib/ai/router.ts");
const toolsSrc = read("lib/ai/tools.ts");
const evidenceSrc = read("lib/ai/evidence.ts");

// ── 3. no model-supplied tool result enters evidence ───────────────────
// The ONLY place loop evidence grows is the router consuming executeAiTool's
// outcome — never the model's text, never a client turn.
checkYes(/loopEvidence\.push\(\.\.\.outcome\.evidence\)/, routerSrc, "evidence-growth-path", "router must accumulate ONLY outcome.evidence");
checkNot(/evidence\.push\((?!\.\.\.outcome\.evidence)/, routerSrc, "evidence-growth-path", "router pushes non-outcome data into evidence");
checkNot(/transcript\.push\(\{[^}]*content:[^}]*\}\s*;\s*loopEvidence/, routerSrc, "evidence-growth-path", "transcript text must not flow into evidence");
checkYes(/export async function executeAiTool/, toolsSrc, "evidence-growth-path", "executeAiTool exists as the only tool-evidence producer");
// Nothing OUTSIDE the AI abstraction (lib/ai/**) may reference the tool
// executor or its outcome type — the client has no path here at all, and
// no other server module may mint tool evidence.
for (const f of tracked) {
  if (!/\.(ts|tsx)$/.test(f)) continue;
  if (f.startsWith("lib/ai/")) continue; // the abstraction itself
  if (!(f.startsWith("lib/") || f.startsWith("app/") || f.startsWith("components/") || f.startsWith("hooks/"))) continue;
  if (f.startsWith("scripts/")) continue; // the audit gates themselves
  let src;
  try {
    src = read(f);
  } catch {
    continue;
  }
  checkNot(/executeAiTool|AiToolOutcome/, src, "evidence-growth-path", `${f} references the tool executor outside lib/ai/`);
}

// ── 4. no client-supplied evidence enters grounding ────────────────────
checkYes(/validateGrounding\(loopEvidence/, routerSrc, "grounding-input", "grounding validates the server evidence set");
checkNot(/validateGrounding\(\s*args\.history/, routerSrc, "grounding-input", "history must never be grounding input");
checkNot(/validateGrounding\([^,]*history/, routerSrc, "grounding-input", "history must never be grounding input");
const chatRouteSrc = read("app/api/chat/route.ts");
checkNot(/history\s*[:,]\s*[^,\n]*evidence/i, chatRouteSrc, "grounding-input", "route must not weld history into evidence");
checkYes(/buildAiEvidencePackage\(/, chatRouteSrc, "grounding-input", "route evidence comes from the canonical assembler");

// ── 5. no raw unstructured provider output reaches the answer ──────────
checkNot(/answer:\s*(text|t)\b(?!\w)/, routerSrc, "raw-output-path", "router must never assign the raw provider text to the answer");
checkYes(/structured-response-invalid/, routerSrc, "raw-output-path", "the bounded honest response exists");
checkYes(/BLOCKED: unable to complete verified analysis/, routerSrc, "raw-output-path", "the tool-exhaustion BLOCKED response exists");

// ── 6. no AI-side score recomputation ──────────────────────────────────
// Type-only imports of the resolver's TYPES are fine; VALUE imports of the
// engine (getStockScore/calculateQvps/buildConsensus) are the duplication
// the gate forbids.
checkNot(/from\s+['"]@?\/?lib\/scoring['"]/, toolsSrc.replace(/^\s*import type .*$/gm, ""), "score-recompute", "tools.ts must not import the scoring engine");
checkNot(/getStockScore|calculateQvps|buildConsensus/, toolsSrc, "score-recompute", "tools.ts must not recompute scores");
checkYes(/buildScoreItem\(/, toolsSrc, "score-recompute", "getScore consumes the canonical score item builder");

// ── 7. exactly ONE tool allowlist ──────────────────────────────────────
let allowlistDefs = 0;
for (const f of tracked) {
  if (!/\.(ts|tsx)$/.test(f)) continue;
  let src;
  try {
    src = read(f);
  } catch {
    continue;
  }
  if (/AI_TOOL_NAMES\s*(:|=(\s*)\[)/.test(src) && /as const/.test(src)) allowlistDefs += 1;
}
check(allowlistDefs === 1, "one-tool-allowlist", `AI_TOOL_NAMES is defined ${allowlistDefs} time(s); expected exactly 1 (lib/ai/tools.ts)`);

// ── 8. strict tool-argument contracts ──────────────────────────────────
checkYes(/\.strict\(\)|z\.strictObject\(/, toolsSrc, "strict-tool-args", "tool arg schemas must be strict zod objects (z.strictObject or .strict())");
{
  // Every z.object( in the tool layer must be closed with .strict() within
  // a few lines (main's style is z.object({...}).strict()).
  const lines = toolsSrc.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/z\.object\(/.test(lines[i])) {
      const window = lines.slice(i, i + 5).join("\n");
      if (!/\.strict\(\)/.test(window)) {
        violations.push({ id: "strict-tool-args", detail: `lib/ai/tools.ts:${i + 1} — z.object( without a chained .strict()` });
      }
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────
if (violations.length > 0) {
  console.error(`\naiLoopAudit: FAIL — ${violations.length} architecture violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.id}] ${v.detail}`);
  }
  process.exit(1);
}
console.log("aiLoopAudit: OK — unified AI-loop architecture invariants hold (8/8 checks).");
