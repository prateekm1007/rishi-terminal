/**
 * scripts/auditModelIdentity.ts — Commit M7 (Coder Directions §4).
 *
 * Automated configuration/provenance audit of the chat model identity:
 *
 *   configured provider        (which provider the env selects)
 *   configured endpoint        (CHAT_API_BASE_URL)
 *   configured model           (CHAT_MODEL env, or the code default)
 *   actual returned model      (the provider's own response.model field)
 *   approved provider registry (lib/registry/providerRegistry)
 *
 * Verdict rule (Rule 1 — never state what you have not verified): the model
 * name is ESTABLISHED only when the provider's own evidence (the /models
 * list and/or the completion response's echoed `model`) contains it. If the
 * default in code ("agnes-2.5-flash") cannot be established that way, the
 * audit says so and the name must not be presented as authoritative.
 *
 * Usage: tsx scripts/auditModelIdentity.ts [--out <path>]
 * Env: CHAT_API_BASE_URL, CHAT_API_KEY, CHAT_MODEL (the production values).
 */
import { PROVIDER_IDS, isProviderApproved, getProviderDefinition } from "../lib/registry/providerRegistry";
import { writeFileSync } from "node:fs";

const DEFAULT_OPENAI_MODEL = "agnes-2.5-flash"; // lib/ai/router.ts (the value under audit)
const GEMINI_MODEL = "models/gemini-2.5-flash";

interface AuditReport {
  timestamp: string;
  configuredProvider: string;
  configuredEndpoint: string | null;
  configuredModelEnv: string | null;
  codeDefaultModel: string;
  effectiveModel: string;
  providerRegistry: {
    chatApi: { approved: boolean; status: string };
    gemini: { approved: boolean; status: string };
  };
  probe: {
    modelsListed: string[] | null;
    modelsListError: string | null;
    completionReturnedModel: string | null;
    completionEchoMatchesRequested: boolean | null;
    completionError: string | null;
  };
  verdict: {
    modelIdentityEstablished: boolean;
    basis: string;
    notes: string[];
  };
}

async function main(): Promise<void> {
  const baseUrl = (process.env.CHAT_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  const apiKey = (process.env.CHAT_API_KEY || "").trim();
  const chatModelEnv = (process.env.CHAT_MODEL || "").trim() || null;
  const effectiveModel = chatModelEnv ?? DEFAULT_OPENAI_MODEL;

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    configuredProvider: baseUrl && apiKey ? "openai-compatible (CHAT_API_BASE_URL + CHAT_API_KEY)" : "none configured",
    configuredEndpoint: baseUrl || null,
    configuredModelEnv: chatModelEnv,
    codeDefaultModel: DEFAULT_OPENAI_MODEL,
    effectiveModel,
    providerRegistry: {
      chatApi: {
        approved: isProviderApproved(PROVIDER_IDS.CHAT_API),
        status: getProviderDefinition(PROVIDER_IDS.CHAT_API)?.status ?? "unknown",
      },
      gemini: {
        approved: isProviderApproved(PROVIDER_IDS.GEMINI),
        status: getProviderDefinition(PROVIDER_IDS.GEMINI)?.status ?? "unknown",
      },
    },
    probe: {
      modelsListed: null,
      modelsListError: null,
      completionReturnedModel: null,
      completionEchoMatchesRequested: null,
      completionError: null,
    },
    verdict: { modelIdentityEstablished: false, basis: "", notes: [] },
  };

  if (!baseUrl || !apiKey) {
    report.verdict.basis = "no openai-compatible provider configured — nothing to establish";
    report.verdict.notes.push("GEMINI fallback would be used if GEMINI_API_KEY is set; its model id is code-fixed (" + GEMINI_MODEL + ") and verifiable against Google's API contract.");
    emit(report);
    return;
  }

  // Probe 1: the provider's own model list.
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: Array<{ id?: string }> };
      report.probe.modelsListed = (body.data ?? []).map(m => m.id ?? "").filter(Boolean);
    } else {
      report.probe.modelsListError = `HTTP ${res.status}`;
    }
  } catch (e) {
    report.probe.modelsListError = e instanceof Error ? e.message : String(e);
  }

  // Probe 2: a minimal completion — the provider's own echo of the model used.
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 1,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { model?: string };
      report.probe.completionReturnedModel = body.model ?? null;
      report.probe.completionEchoMatchesRequested =
        body.model != null && body.model.replace(/^models\//, "") === effectiveModel.replace(/^models\//, "");
    } else {
      report.probe.completionError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    }
  } catch (e) {
    report.probe.completionError = e instanceof Error ? e.message : String(e);
  }

  // Verdict (Rule 1): established only from provider evidence.
  const listed = report.probe.modelsListed?.some(id => id.replace(/^models\//, "") === effectiveModel.replace(/^models\//, "")) ?? false;
  const echoed = report.probe.completionEchoMatchesRequested === true;
  if (listed || echoed) {
    report.verdict.modelIdentityEstablished = true;
    report.verdict.basis = [
      listed ? "the provider's /models list contains the model id" : null,
      echoed ? `the completion response itself echoes model="${report.probe.completionReturnedModel}"` : null,
    ].filter(Boolean).join("; ");
  } else {
    report.verdict.basis = "the provider's own evidence does not contain the configured/default model id";
    report.verdict.notes.push(
      "Per Coder Directions §4 the model name must NOT be presented as authoritative until established from configuration/provider evidence.",
    );
    if (report.probe.modelsListError) report.verdict.notes.push(`/models probe failed: ${report.probe.modelsListError}`);
    if (report.probe.completionError) report.verdict.notes.push(`completion probe failed: ${report.probe.completionError}`);
    if (report.probe.modelsListed && report.probe.modelsListed.length > 0) {
      report.verdict.notes.push(`provider offers: ${report.probe.modelsListed.slice(0, 20).join(", ")}`);
    }
  }

  emit(report);
}

function emit(report: AuditReport): void {
  const json = JSON.stringify(report, null, 2);
  console.log(json);
  const outIdx = process.argv.indexOf("--out");
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    writeFileSync(process.argv[outIdx + 1], json + "\n");
    console.error(`\nwritten: ${process.argv[outIdx + 1]}`);
  }
  process.exit(report.verdict.modelIdentityEstablished || report.configuredProvider === "none configured" ? 0 : 2);
}

main().catch(e => {
  console.error("audit failed:", e);
  process.exit(1);
});
