/**
 * R4-07 (founder Round-16 C7) — learning-hub acceptance.
 *
 * Founder acceptance, verbatim: "build passes; every page has unique
 * title/description; no financial claims without a source link (copy
 * audit)."
 *
 * The copy audit here is structural: every biography and every principle
 * MUST carry at least one source URL, and performance/outcome language
 * ("beat the market", "outperform", "guaranteed", "assured returns",
 * "multibagger returns"...) is banned outright — educational pages make
 * no claims about results. (The L5-01 counsel-owned copyAudit.ts, when
 * it exists, scans the whole app; this test owns the hub.)
 */
import { describe, expect, it } from "vitest";
import { PHILOSOPHIES } from "../data/learning/philosophies";
import { SCREENER_PRESETS } from "../lib/screener/presets";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");

const BANNED_PHRASES = [
  "beat the market",
  "beats the market",
  "outperform",
  "outperformed",
  "guaranteed",
  "assured returns",
  "multibagger returns",
  "sure-shot",
  "risk-free",
];

const URL_RE = /^https:\/\/[^\s]+$/;

describe("R4-07 — learning hub", () => {
  it("has content (not vacuous — positive control)", () => {
    expect(PHILOSOPHIES.length).toBeGreaterThanOrEqual(5);
  });

  it("every page has a UNIQUE title and description", () => {
    const titles = PHILOSOPHIES.map((p) => p.title);
    const descriptions = PHILOSOPHIES.map((p) => p.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const p of PHILOSOPHIES) {
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.description.length).toBeGreaterThan(30);
    }
  });

  it("every biography and principle carries at least one valid source URL", () => {
    for (const p of PHILOSOPHIES) {
      expect(p.biography.sources.length, `${p.slug} biography has no source`).toBeGreaterThan(0);
      for (const s of p.biography.sources) expect(URL_RE.test(s.url), `${p.slug}: bad source url ${s.url}`).toBe(true);
      expect(p.principles.length, `${p.slug} has no principles`).toBeGreaterThanOrEqual(4);
      for (const [i, pr] of p.principles.entries()) {
        expect(pr.sources.length, `${p.slug} principle ${i + 1} has no source`).toBeGreaterThan(0);
        for (const s of pr.sources) {
          expect(URL_RE.test(s.url), `${p.slug} principle ${i + 1}: bad source url ${s.url}`).toBe(true);
        }
      }
    }
  });

  it("the copy audit holds: no performance/outcome claims anywhere in the hub content", () => {
    const all = JSON.stringify(PHILOSOPHIES).toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      expect(all, `banned performance phrase in hub content: "${phrase}"`).not.toContain(phrase);
    }
  });

  it("every referenced screener preset exists", () => {
    const presetIds = new Set(SCREENER_PRESETS.map((p) => p.id));
    for (const p of PHILOSOPHIES) {
      expect(presetIds.has(p.screenerPreset), `${p.slug} links a nonexistent preset ${p.screenerPreset}`).toBe(true);
    }
  });

  it("every referenced scorer module exists in lib/scorers/", () => {
    for (const p of PHILOSOPHIES) {
      const file = path.join(REPO, p.howWeScoreIt.scorer);
      expect(existsSync(file), `${p.slug} references a missing scorer ${p.howWeScoreIt.scorer}`).toBe(true);
    }
  });

  it("both page routes exist (index + [slug]) and render the registry", () => {
    const index = readFileSync(path.join(REPO, "app/learn/page.tsx"), "utf8");
    const detail = readFileSync(path.join(REPO, "app/learn/[slug]/page.tsx"), "utf8");
    expect(index).toContain("PHILOSOPHIES");
    expect(detail).toContain("philosophyBySlug");
    expect(detail).toContain("generateStaticParams");
    expect(detail).toContain("generateMetadata");
  });

  it("slugs are unique and URL-safe", () => {
    const slugs = PHILOSOPHIES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(/^[a-z0-9-]+$/.test(s), `bad slug ${s}`).toBe(true);
  });
});
