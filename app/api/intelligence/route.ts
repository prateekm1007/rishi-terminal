// app/api/intelligence/route.ts (INT-A10, roadmap item A10) — THE ONE
// INTELLIGENCE API SURFACE.
//
// GET /api/intelligence?capability=<id>&subject=<symbol>
//
// Pre-registration: docs/intelligence/intelligenceApi.md (committed BEFORE
// any evaluation). Frozen architecture: ONE intelligence API — product
// surfaces (Phase B–J) consume THIS route, never their own synthesis path.
//
// Contract (pinned):
//   200 { ok: true, capability, subject, insight: <A1 RishiInsight> }
//     with additive audit fields: cached, timings, cacheWriteError (only
//     on a disclosed persistence failure).
//   400 { error: "Invalid capability" }   — id not in the closed registry
//   400 { error: "Unknown symbol" }       — the ONE canonical registry gate
//   404 { error: "No generated insight for this subject" } — miss + non-material
//   404 { error: "Insight not available" } — generation refused/failed, or
//           the assembled artifact failed the A1 contract (never a
//           fabricated artifact)
//   429 rate/quota exhaustion (before any provider call)
//   503 { error: "Intelligence unavailable" } — chain/infrastructure errors
//
// Controls (reused, never a second stack):
//   - the closed capability registry + the ONE canonical symbol gate
//     (normalizeSymbolInput — the same boundary the chat route and the AI
//     tool layer use; no second symbol registry) run FIRST: validation
//     refusals cost nothing;
//   - a persistent per-IP burst limit (lib/rateLimit) guards the
//     DB-reading chain;
//   - the generation path (cache miss + A4-material ONLY) passes the
//     EXISTING global spend reservation/settlement (lib/chat/globalSpend)
//     and consumes the SAME persistent per-identity daily quota rpc the
//     chat route uses (consume_chat_quota / refund_chat_quota — one
//     atomic counter, no second quota system); refunds on every
//     pre-provider failure, settlement on the provider-reported usage;
//   - identity: the session account id, else the pseudonymous per-IP
//     digest — audit + quota identity for the generation path only
//     (founder free-access decisions stand; no entitlement gate);
//   - materiality stays A4's EXCLUSIVE decision (direction 11): this route
//     adds no "should the model run?" heuristic, and a non-material chain
//     never reaches any spend control (zero AI, zero consumption).
//
// Generation (ONE bounded loop, sanctioned caller #2 — pinned by test):
// the route calls generateEvidenceGroundedAnswer with a SERVER-COMPOSED
// system instruction and message (no client text enters either), the
// canonical evidence package (buildAiEvidencePackage + the per-request
// canonical stock state) joined package-first with the chain's own
// evidence items (the A9 merge), and assembles the artifact through the
// chain's PURE assembler (parse-or-refuse at the A1 boundary). The model
// is restricted to the prose families; every number, status, confidence,
// materiality and provenance field is computed by the chain.
//
// What this route is NOT: a second chat, a second evidence package, a
// second prompt registry (one fixed instruction block, pre-registered in
// docs/intelligence/intelligenceApi.md), a clock for the chain (the chain
// receives the wall clock as data; the route owns the timings), or an
// authentication boundary (none exists for the founder-approved free
// surface; the generation path still fails closed on identity).

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { anonQuotaIdFromEnv } from "@/lib/auth/anonIdentity";
import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import {
  chatDisabled,
  globalRequestCapExceeded,
  releaseGlobalTokens,
  reserveGlobalTokens,
  settleGlobalTokens,
} from "@/lib/chat/globalSpend";
import { normalizeSymbolInput } from "@/lib/registry/validateInput";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  buildAiEvidencePackage,
  createCanonicalStockState,
} from "@/lib/ai/evidence";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
import { mergeInsightEvidence } from "@/lib/intelligence/evidenceMerge";
import { buildNewsEvidenceDeps } from "@/lib/intelligence/newsEvidence";
import { isIntelligenceCapability } from "@/lib/intelligence/capabilities";
import {
  assembleInsightArtifact,
  runIntelligenceChain,
} from "@/lib/intelligence/chain";
import { writeCachedInsight } from "@/lib/intelligence/insightCache";

// Persistent per-IP burst guard for the intelligence surface (the chat
// route's own burst window is 60 s; the chain reads three history windows
// per request — one shared persistent counter family, its own key space).
const BURST_WINDOW_SECONDS = 60;
const BURST_MAX_REQUESTS = 30;

// The ONE fixed generation instruction (server-composed; no client text
// ever enters it). The wording mirrors the grounding validator's rules so
// the model's output is shaped for validation, not around it.
const GENERATION_SYSTEM_PROMPT = [
  "You are the synthesis layer of Rishi's intelligence pipeline.",
  "You write the prose fields of ONE structured insight artifact from the provided evidence context only.",
  "Rules:",
  "(1) ground every factual claim in evidence ids from the provided context;",
  "(2) never state a number that is not present in the cited evidence facts;",
  "(3) never give investment advice, price targets, forecasts or superlatives;",
  "(4) never upgrade provenance: seed or derived data stays labelled as such;",
  "(5) produce ONE concise paragraph (at most 120 words) summarizing what changed for the subject and why it matters, as a neutral investigation statement;",
  "(6) add up to 3 short uncertainty lines (what is not known or not established by the evidence).",
].join(" ");

function generationMessage(subject: string): string {
  return (
    `Synthesize the insight prose for ${subject}. ` +
    "The deterministic chain already computed the material evidence in the provided context; " +
    "write the summary paragraph of the insight (what changed and why it matters, grounded in the evidence ids) " +
    "and up to 3 uncertainty lines. Do not restate numbers outside the cited evidence facts."
  );
}

function clientIp(req: NextRequest): string {
  // Same platform contract as the chat route: Vercel overwrites
  // x-forwarded-for with the client IP; parsing the LAST entry stays
  // correct under both platform models.
  const h = req.headers.get("x-forwarded-for") ?? "";
  const parts = h.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "unknown";
}

/** The SAME persistent per-identity daily quota the chat route consumes —
 *  one atomic counter (rpc consume_chat_quota), no second quota system.
 *  Returns false on refusal AND on infrastructure error (fail closed). */
async function consumeQuota(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getAdminSupabase().rpc("consume_chat_quota", {
      p_user_id: userId,
    });
    if (error) {
      console.error("[intelligence] quota rpc error (failing closed):", error.message);
      return false;
    }
    const r = data as { ok?: boolean } | null;
    return r?.ok === true;
  } catch (e) {
    console.error(
      "[intelligence] quota rpc exception (failing closed):",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** Mirror of the chat route's refund (rpc refund_chat_quota) — best-effort:
 *  a failed refund is logged and never rethrown. */
async function refundQuota(userId: string): Promise<void> {
  try {
    const { error } = await getAdminSupabase().rpc("refund_chat_quota", {
      p_user_id: userId,
    });
    if (error) console.error("[intelligence] quota refund failed:", error.message);
  } catch (e) {
    console.error(
      "[intelligence] quota refund exception:",
      e instanceof Error ? e.message : e,
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const routeStart = Date.now();

  // 1. Validation FIRST (nothing runs, nothing is consumed on a refusal).
  const capability = req.nextUrl.searchParams.get("capability");
  if (!isIntelligenceCapability(capability)) {
    return NextResponse.json({ error: "Invalid capability" }, { status: 400 });
  }
  const rawSubject = req.nextUrl.searchParams.get("subject") ?? "";
  // The ONE canonical registry gate — validates AND canonicalises exactly
  // like the chat route and the AI tool layer (no second symbol boundary).
  const subject = normalizeSymbolInput(rawSubject);
  if (!subject) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  // 2. Identity (audit; REQUIRED only on the generation path — fail closed
  //    there, never degrade to a pepperless digest).
  const user = await getSessionUser();
  const ip = clientIp(req);

  // 3. Persistent per-IP burst guard (before the DB-reading chain).
  const burst = await checkRateLimit(
    `intelligence:ip:${ip}`,
    BURST_MAX_REQUESTS,
    BURST_WINDOW_SECONDS,
  );
  if (!burst.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 4. The chain — the ONE substrate composition. Infrastructure throws
  //    map to the honest 503 (the pre-registration's fail-closed table).
  let chainMs = 0;
  let result;
  try {
    const chainStart = Date.now();
    result = await runIntelligenceChain({
      capability,
      subject,
      nowMs: Date.now(),
    });
    chainMs = Date.now() - chainStart;
  } catch (e) {
    console.error(
      "[intelligence] chain failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Intelligence unavailable" },
      { status: 503 },
    );
  }

  // 5. Deterministic path (thesis) or cache hit (insight): serve.
  if (result.insight) {
    return NextResponse.json({
      ok: true,
      capability,
      subject,
      insight: result.insight,
      cached: result.cached,
      timings: { wallMs: Date.now() - routeStart, chainMs },
    });
  }

  // 6. Miss + non-material: the honest 404, zero AI, zero consumption
  //    (the A4 economic gate held before any control ran).
  if (!result.generation) {
    return NextResponse.json(
      { error: "No generated insight for this subject" },
      { status: 404 },
    );
  }

  // 7. Generation path — cache miss on an A4-MATERIAL chain. The spend
  //    controls engage HERE and only here (rule 12: persistent limit,
  //    atomic counter — the existing global caps + the shared daily quota).
  const generation = result.generation;
  if (chatDisabled()) {
    return NextResponse.json(
      { error: "Intelligence unavailable" },
      { status: 503 },
    );
  }
  if (await globalRequestCapExceeded()) {
    return NextResponse.json(
      { error: "Intelligence unavailable" },
      { status: 503 },
    );
  }
  let quotaIdentity: string;
  try {
    quotaIdentity = user?.id ?? anonQuotaIdFromEnv(ip);
  } catch {
    // No pepper configured — the anonymous identity refuses to degrade
    // (the chat route's W3 rule; fail closed, never a weaker scheme).
    console.error("[intelligence] anonymous identity unavailable");
    return NextResponse.json(
      { error: "Intelligence unavailable" },
      { status: 503 },
    );
  }
  if (!(await reserveGlobalTokens(false))) {
    return NextResponse.json(
      { error: "Intelligence unavailable" },
      { status: 503 },
    );
  }
  if (!(await consumeQuota(quotaIdentity))) {
    await releaseGlobalTokens();
    return NextResponse.json({ error: "Daily quota exhausted" }, { status: 429 });
  }

  // 8. Evidence assembly + the ONE bounded loop. Every failure BEFORE the
  //    provider call refunds and releases; failures AFTER settlement are
  //    honest 404s (the spend happened — never a fake refund).
  let generationMs = 0;
  let answer;
  try {
    const genStart = Date.now();
    // One canonical observation state per request: the package below and
    // every tool call inside the loop reuse it (the chat route's M7 rule).
    const stockState = createCanonicalStockState();
    // INT-B1: the ONE news deps pass (matched /api/news items) joins the
    // canonical package before the merge — a failed feed arrives as an
    // empty deps array (the honest unavailable note; fail-closed).
    const newsDeps = await buildNewsEvidenceDeps(subject, req.url);
    const evidencePackage = await buildAiEvidencePackage(subject, { news: newsDeps }, stockState);
    // The chain's own evidence items join the canonical array
    // package-first (the A9 merge — ONE merge implementation, reused).
    const evidence = mergeInsightEvidence(
      evidencePackage?.items ?? [],
      generation.scaffold.evidence,
    );
    answer = await generateEvidenceGroundedAnswer({
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      history: [],
      message: generationMessage(subject),
      evidence,
      stockState,
    });
    generationMs = Date.now() - genStart;
  } catch (e) {
    console.error(
      "[intelligence] generation failed:",
      e instanceof Error ? e.message : e,
    );
    await refundQuota(quotaIdentity);
    await releaseGlobalTokens();
    return NextResponse.json(
      { error: "Insight not available" },
      { status: 404 },
    );
  }
  if (!answer) {
    // Unconfigured/no approved provider — the honest unavailable state,
    // quota refunded, reservation released (nothing was spent upstream).
    console.error("[intelligence] no approved provider configured");
    await refundQuota(quotaIdentity);
    await releaseGlobalTokens();
    return NextResponse.json(
      { error: "Insight not available" },
      { status: 404 },
    );
  }
  // Settlement to the provider-reported usage (the W3-A rule: unknown
  // spend is charged at the ceiling; best-effort after the response).
  await settleGlobalTokens(answer.usage?.totalTokens);

  // 9. Assemble through the PURE assembler and the ONE A1 parser —
  //    parse-or-refuse: a contract-failing artifact is never served and
  //    never cached (the spend is settled; the state stays honest).
  const candidate = assembleInsightArtifact(generation.scaffold, {
    answer: answer.answer,
    provider: answer.provider,
    model: answer.model,
    synthesizedAtMs: Date.now(),
    claimsVerified: answer.claimsVerified,
    claimCount: answer.claims.length,
    uncertainties: answer.uncertainties,
  });
  if (!candidate) {
    console.error("[intelligence] assembled artifact refused by the A1 contract");
    return NextResponse.json(
      { error: "Insight not available" },
      { status: 404 },
    );
  }

  // 10. Persist through the ONE A7 writer (parse-or-refuse inside). A
  //     persistence failure is DISCLOSED on the response — the artifact
  //     still serves (it is contract-valid), it just is not cached.
  const write = await writeCachedInsight({
    changeKey: generation.changeKey,
    feature: generation.feature,
    subject: generation.subject,
    payload: candidate,
  });
  if (!write.ok) {
    console.error("[intelligence] cache write failed:", write.error);
  }

  return NextResponse.json({
    ok: true,
    capability,
    subject,
    insight: candidate,
    cached: false,
    ...(write.ok ? {} : { cacheWriteError: write.error }),
    timings: {
      wallMs: Date.now() - routeStart,
      chainMs,
      generationMs,
    },
  });
}
