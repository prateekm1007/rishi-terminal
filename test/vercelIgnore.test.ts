// test/vercelIgnore.test.ts — Round 11, X1: the Vercel ignored-build-step
// gate (scripts/ci/vercel-ignore.sh) must SKIP (exit 0) only docs-only
// change sets, and MUST BUILD (exit non-zero) for anything else — code,
// config (vercel.json), data, mixed changes, deletions — and whenever the
// diff cannot be determined (no parent commit, not a git checkout).
// Constitution rules 21/24: this is the gate that proves the skip rule
// bites in both directions.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(__dirname, "..", "scripts", "ci", "vercel-ignore.sh");

const repos: string[] = [];
afterAll(() => {
  for (const dir of repos) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
}

function commitAll(cwd: string, message: string): void {
  git(cwd, "add", "-A");
  git(
    cwd,
    "-c",
    "user.email=ci@example.com",
    "-c",
    "user.name=CI",
    "commit",
    "--no-gpg-sign",
    "-m",
    message,
  );
}

function makeRepo(): string {
  const cwd = mkdtempSync(path.join(tmpdir(), "vercel-ignore-"));
  repos.push(cwd);
  git(cwd, "init", "--quiet");
  writeFileSync(path.join(cwd, "seed.txt"), "base\n");
  commitAll(cwd, "base");
  return cwd;
}

function runScript(cwd: string, env: Record<string, string | undefined> = {}): number {
  try {
    execFileSync("bash", [SCRIPT], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env } as NodeJS.ProcessEnv,
    });
    return 0;
  } catch (err) {
    const e = err as { status?: number };
    return e.status ?? -1;
  }
}

function write(cwd: string, rel: string, content: string): void {
  const target = path.join(cwd, rel);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

describe("vercel-ignore.sh (X1 ignored-build-step gate)", () => {
  it("skips (exit 0) when only docs/** changed", () => {
    const cwd = makeRepo();
    write(cwd, "docs/evidence/round11/note.md", "# evidence\n");
    write(cwd, "docs/RELEASE.md", "# updated\n");
    commitAll(cwd, "docs only");
    expect(runScript(cwd)).toBe(0);
  });

  it("skips (exit 0) when only a root-level *.md changed", () => {
    const cwd = makeRepo();
    write(cwd, "README.md", "# readme updated\n");
    commitAll(cwd, "readme only");
    expect(runScript(cwd)).toBe(0);
  });

  it("skips (exit 0) when only a nested *.md outside docs/ changed", () => {
    const cwd = makeRepo();
    write(cwd, "app/stock/NOTES.md", "notes\n");
    commitAll(cwd, "nested md");
    expect(runScript(cwd)).toBe(0);
  });

  it("skips (exit 0) when only scripts/ci/** changed", () => {
    const cwd = makeRepo();
    write(cwd, "scripts/ci/vercel-ignore.sh", "# updated\n");
    write(cwd, "scripts/ci/some_invariants.sql", "-- sql\n");
    commitAll(cwd, "ci scripts only");
    expect(runScript(cwd)).toBe(0);
  });

  it("builds (exit non-zero) when app code changed", () => {
    const cwd = makeRepo();
    write(cwd, "app/api/chat/route.ts", "export {};\n");
    commitAll(cwd, "code change");
    expect(runScript(cwd)).not.toBe(0);
  });

  it("builds (exit non-zero) when vercel.json changed (deploy config must ship)", () => {
    const cwd = makeRepo();
    write(cwd, "vercel.json", "{}\n");
    commitAll(cwd, "config change");
    expect(runScript(cwd)).not.toBe(0);
  });

  it("builds (exit non-zero) when docs and code changed together", () => {
    const cwd = makeRepo();
    write(cwd, "docs/RELEASE.md", "# updated\n");
    write(cwd, "lib/livePrice.ts", "export {};\n");
    commitAll(cwd, "mixed");
    expect(runScript(cwd)).not.toBe(0);
  });

  it("builds (exit non-zero) when an app file was only DELETED", () => {
    const cwd = makeRepo();
    write(cwd, "app/thing.ts", "export {};\n");
    commitAll(cwd, "add thing");
    rmSync(path.join(cwd, "app/thing.ts"));
    write(cwd, "docs/notes.md", "note\n");
    commitAll(cwd, "delete + docs");
    expect(runScript(cwd)).not.toBe(0);
  });

  it("builds (exit non-zero) on the very first commit (no parent — fail-safe)", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "vercel-ignore-fs-"));
    repos.push(cwd);
    git(cwd, "init", "--quiet");
    write(cwd, "docs/only.md", "# docs\n");
    commitAll(cwd, "first commit ever");
    // Even a docs-only first commit must build: with no parent there is
    // no diff to reason about, and the gate must never guess a skip.
    expect(runScript(cwd)).not.toBe(0);
  });

  it("builds (exit non-zero) outside a git checkout (fail-safe)", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "vercel-ignore-nogit-"));
    repos.push(cwd);
    expect(runScript(cwd)).not.toBe(0);
  });

  it("skips (exit 0) ANY staging-project deployment, even a code change (git integration suspended)", () => {
    const cwd = makeRepo();
    write(cwd, "app/api/chat/route.ts", "export {};\n");
    commitAll(cwd, "code change on staging");
    expect(runScript(cwd, { VERCEL_PROJECT_NAME: "rishi-terminal-staging" })).toBe(0);
  });

  it("skips (exit 0) staging by project id, not just by name", () => {
    const cwd = makeRepo();
    write(cwd, "lib/livePrice.ts", "export {};\n");
    commitAll(cwd, "code change on staging by id");
    expect(
      runScript(cwd, { VERCEL_PROJECT_ID: "prj_7B1N3qceJOAh5jVAI32RhF84Zygm" }),
    ).toBe(0);
  });

  it("builds (exit non-zero) the PRODUCTION project on a code change (only staging is suspended)", () => {
    const cwd = makeRepo();
    write(cwd, "app/api/chat/route.ts", "export {};\n");
    commitAll(cwd, "code change on production");
    expect(
      runScript(cwd, {
        VERCEL_PROJECT_NAME: "rishi-terminal",
        VERCEL_PROJECT_ID: "prj_vsOQe05nMx2OlmK70AII3MpfPT3Y",
      }),
    ).not.toBe(0);
  });
});
