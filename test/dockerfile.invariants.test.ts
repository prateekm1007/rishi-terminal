/**
 * test/dockerfile.invariants.test.ts — E1 fail-first gate.
 *
 * The Hugging Face staging Space contract (founder directive E1,
 * measurement only) is enforced by static assertions on Dockerfile /
 * .dockerignore / README front matter. Rule 24: this gate was proven to
 * bite before being relied on — the deliberate-violation RED run and the
 * CI capture are pasted in the E1 PR and recorded in
 * docs/evidence/round18/e1-hf-staging-space.md.
 *
 * Violations this test exists to catch (each maps to a founder acceptance):
 *  - runtime stage running as root            (HF runs uid 1000; founder: non-root)
 *  - wrong port / host binding                (founder: next start -p 7860 -H 0.0.0.0)
 *  - missing or wrong healthcheck             (founder: a healthcheck)
 *  - secret material baked into the image     (Constitution rule 8)
 *  - .env* present in the build context       (Constitution rule 8)
 *  - Space README front matter wrong/missing  (HF: sdk: docker, app_port: 7860)
 *  - ISR writes failing as non-root           (build output chowned to uid 1000)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..");
const dockerfile = readFileSync(join(repoRoot, "Dockerfile"), "utf8");
const dockerignore = readFileSync(join(repoRoot, ".dockerignore"), "utf8");
const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

/** Extract the final (runtime) stage of the multi-stage Dockerfile. */
function runtimeStage(): string {
  const stages = dockerfile.split(/^FROM /m).filter((s) => s.trim().length > 0);
  expect(stages.length).toBeGreaterThanOrEqual(3);
  return stages[stages.length - 1];
}

/** Extract the YAML front matter block from README.md. */
function readmeFrontMatter(): string {
  const match = readme.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(match, "README.md must open with YAML front matter (Space config)").not.toBeNull();
  return match![1];
}

describe("Dockerfile invariants (E1, HF staging Space contract)", () => {
  it("pins Node 22 on every stage", () => {
    const froms = dockerfile.match(/^FROM .+$/gm) ?? [];
    expect(froms.length).toBeGreaterThanOrEqual(3);
    for (const line of froms) {
      expect(line, `stage must pin node:22: ${line}`).toContain("node:22-");
    }
  });

  it("runs the runtime stage as a non-root user (uid 1000)", () => {
    const stage = runtimeStage();
    expect(stage).toMatch(/^USER node\b/m);
    expect(stage).not.toMatch(/^USER root\b/m);
    expect(dockerfile).not.toMatch(/^USER root\b/m);
  });

  it("exposes and binds port 7860 on 0.0.0.0 via next start", () => {
    expect(dockerfile).toMatch(/^EXPOSE 7860$/m);
    expect(runtimeStage()).toMatch(
      /CMD \["npx", "next", "start", "-p", "7860", "-H", "0\.0\.0\.0"\]/
    );
  });

  it("healthchecks the public /api/health endpoint (any response = alive)", () => {
    expect(dockerfile).toMatch(/^HEALTHCHECK /m);
    expect(dockerfile).toContain("/api/health");
    // Liveness semantics, documented in the Dockerfile: on a seed-only
    // Space /api/health honestly answers 503 (fail closed, no DB env).
    // The probe must treat any well-formed HTTP response as alive and
    // only fail on transport errors — it must NOT depend on r.ok, which
    // would mark a working degraded deployment permanently unhealthy.
    expect(dockerfile).toMatch(/HEALTHCHECK[\s\S]*fetch\('http:\/\/127\.0\.0\.1:7860\/api\/health'\)\.then\(\(\)=>process\.exit\(0\)\)\.catch\(\(\)=>process\.exit\(1\)\)/);
    expect(dockerfile).not.toMatch(/HEALTHCHECK[\s\S]*r\.ok/);
  });

  it("chowns the ISR-writable build output to the runtime user", () => {
    // next start revalidates ISR by writing .next/cache at runtime. The
    // runtime stage drops to `node` (uid 1000); root-owned build output
    // would make every ISR write fail silently and freeze pages stale.
    const stage = runtimeStage();
    expect(stage).toMatch(/COPY --from=builder --chown=node:node \/app\/\.next \.\/\.next/);
    expect(stage).toMatch(/COPY --from=builder --chown=node:node \/app\/public \.\/public/);
  });

  it("builds with npm ci and npm run build in separate stages", () => {
    expect(dockerfile).toMatch(/^RUN npm ci$/m);
    expect(dockerfile).toMatch(/^RUN npm run build$/m);
  });

  it("never bakes secrets: build args are limited to the public NEXT_PUBLIC set with placeholder defaults", () => {
    const allowed = new Map([
      // The only defaults a build may carry are the CI placeholders and an
      // empty base URL (public by design; identical to the CI build env).
      // A new value here means a new public default — extend this set in
      // the open, never by bypassing the gate.
      ["NEXT_PUBLIC_SUPABASE_URL", ['"https://placeholder.supabase.co"']],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ['"ci-placeholder-anon-key"']],
      ["NEXT_PUBLIC_BASE_URL", ['""']],
    ]);
    const lines = dockerfile.match(/^ARG [A-Za-z_][A-Za-z0-9_]*(?:=.*)?$/gm) ?? [];
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const match = line.match(/^ARG ([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/)!;
      const [, name, defaultValue] = match;
      const allowedDefaults = allowed.get(name);
      expect(allowedDefaults, `unexpected build ARG: ${name}`).toBeDefined();
      if (defaultValue !== undefined) {
        expect(
          allowedDefaults,
          `ARG ${name} carries a non-whitelisted default: ${defaultValue}`
        ).toContain(defaultValue);
      }
    }
    // No build-time secret mounts, no .env copies into any image layer.
    expect(dockerfile).not.toContain("--mount=type=secret");
    expect(dockerfile).not.toMatch(/^COPY .+\.env/m);
    // No production secret name may appear in an INSTRUCTION line (comments
    // documenting the posture are fine — instructions bake values). Strip
    // comment lines before scanning so the guard cannot be silenced by
    // moving a secret reference into executable form, and vice versa.
    const instructions = dockerfile
      .split("\n")
      .filter((l) => !/^\s*#/.test(l))
      .join("\n");
    for (const forbidden of ["SERVICE_ROLE", "CRON_SECRET", "CHAT_API_KEY", "GEMINI_API_KEY", "FMP_API_KEY", "ANON_ID_PEPPER", "QUOTES_WARM_SECRET"]) {
      expect(instructions, `forbidden secret reference: ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("build-context hygiene (E1, rule 8)", () => {
  it("keeps .env files, git metadata and build output out of the image", () => {
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^\.env\.\*$/m);
    expect(dockerignore).toMatch(/^\.git$/m);
    expect(dockerignore).toMatch(/^node_modules$/m);
    expect(dockerignore).toMatch(/^\.next$/m);
  });

  it("still ships the build-time methodology content (S2-01 loader)", () => {
    // /methodology pages read docs/methodology/*.md at BUILD time via
    // lib/methodology/index.ts. The first image build failed with
    // "ENOENT ... /app/docs/methodology" once `docs` and `*.md` were
    // excluded — these un-excludes are load-bearing, and the CI
    // docker-space build is the semantic bite (a regression fails it).
    const lastIndexOf = (s: string) => dockerignore.lastIndexOf(s);
    expect(lastIndexOf("!docs/methodology")).toBeGreaterThan(-1);
    expect(lastIndexOf("!docs/methodology/*.md")).toBeGreaterThan(-1);
    // Last-match-wins: the un-excludes must come AFTER both the `docs`
    // and the `*.md` exclusions or they are dead lines.
    expect(lastIndexOf("!docs/methodology")).toBeGreaterThan(
      dockerignore.search(/^docs$/m)
    );
    expect(lastIndexOf("!docs/methodology/*.md")).toBeGreaterThan(
      dockerignore.search(/^\*\.md$/m)
    );
  });
});

describe("runtime dependency hygiene (E1, self-hosted next start)", () => {
  it("imports no devDependency from runtime source", () => {
    // `next start` (self-hosted — the Space, unlike Vercel) loads
    // next.config.ts at runtime with production-only node_modules
    // (`npm ci --omit=dev`). A devDependency imported from runtime
    // source crashes the server after boot ("Cannot find module ...").
    // This exact incident: @next/bundle-analyzer in next.config.ts
    // (Space RUNTIME_ERROR + CI docker job red on 2026-10-05; fixed by
    // moving it to dependencies).
    const walk = (dir: string): string[] =>
      readdirSync(dir, { recursive: true, withFileTypes: false })
        .map((f) => join(dir, String(f)))
        .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.includes("node_modules"));
    const files = [
      ...walk(join(repoRoot, "app")),
      ...walk(join(repoRoot, "lib")),
      join(repoRoot, "next.config.ts"),
    ];
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    const imported: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const name of devDeps) {
        const esc = name.replace(/[/]/g, "\\/");
        if (new RegExp(`(from|require\\(|import\\()\\s*["']${esc}`).test(src)) {
          imported.push(`${name} (${file.replace(repoRoot + "/", "")})`);
        }
      }
    }
    expect(imported, `runtime source imports devDependencies: ${imported.join(", ")}`).toEqual([]);
  });
});

describe("Space README front matter (E1, HF Space configuration)", () => {
  it("declares the docker SDK on app port 7860", () => {
    const fm = readmeFrontMatter();
    expect(fm).toMatch(/^sdk: docker$/m);
    expect(fm).toMatch(/^app_port: 7860$/m);
    expect(fm).toMatch(/^title: /m);
  });
});
