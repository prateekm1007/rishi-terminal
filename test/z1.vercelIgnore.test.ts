// Z1 (Round 13): the deploy gate must stop deploy starvation.
//
// Founder defect 1 (Round 13): ~12 merges in one day burned the Hobby-plan
// 100/day deployment quota — previews, staging mirrors and every code merge
// count against it, and production sat rate-limited for 24 h twice.
//
// Contracts below spawn REAL git repositories (child_process) and run
// scripts/ci/vercel-ignore.sh against them with the Vercel environment
// variables mocked. Written to FAIL FIRST against the pre-Z1 script
// (Rule 21/24): it has no VERCEL_ENV gate, no VERCEL_GIT_PREVIOUS_SHA
// support and no artifacts/** skip scope.

import { describe, it, expect, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(process.cwd(), "scripts", "ci", "vercel-ignore.sh");

interface Repo {
  root: string;
  run: (opts: { env?: Record<string, string> }) => { status: number };
  commitFile: (path: string, content: string, message: string) => string;
  checkoutBranch: (name: string, from?: string) => void;
  mergeNoFF: (branch: string, message: string) => string;
  rev: (ref: string) => string;
}

const cleanup: string[] = [];

function makeRepo(): Repo {
  const root = mkdtempSync(join(tmpdir(), "z1-fixture-"));
  cleanup.push(root);
  const g = (args: string[], cwd = root) =>
    execFileSync("git", args, { cwd, env: { ...process.env, GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@local", GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_NAME_OVERRIDE: undefined, GIT_COMMITTER_EMAIL: "fixture@local" } });
  g(["init", "--initial-branch=main"]);
  g(["config", "user.email", "fixture@local"]);
  g(["config", "user.name", "fixture"]);
  writeFileSync(join(root, "README.md"), "# fixture\n");
  g(["add", "."]);
  g(["commit", "-m", "init"]);

  const repo: Repo = {
    root,
    rev: (ref) => g(["rev-parse", ref]).toString().trim(),
    commitFile: (path, content, message) => {
      mkdirSync(join(root, path, ".."), { recursive: true });
      writeFileSync(join(root, path), content);
      g(["add", "."]);
      g(["commit", "-m", message]);
      return repo.rev("HEAD");
    },
    checkoutBranch: (name, from) => {
      try {
        g(["checkout", name]);
      } catch {
        g(["checkout", "-b", name]);
      }
      if (from) g(["reset", "--hard", from]);
    },
    mergeNoFF: (branch, message) => {
      g(["merge", "--no-ff", branch, "-m", message]);
      return repo.rev("HEAD");
    },
    run: ({ env = {} } = {}) =>
      spawnSync("bash", [SCRIPT], {
        cwd: root,
        env: { ...process.env, ...env },
      }).status ?? -1,
  };
  return repo;
}

afterEach(() => {
  while (cleanup.length) {
    const dir = cleanup.pop();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

// The Vercel env for a PRODUCTION build of a normal push.
const PROD = { VERCEL: "1", VERCEL_ENV: "production" };

describe("Z1 — non-production builds never consume the quota", () => {
  it("VERCEL_ENV=preview skips even when app code changed", () => {
    const r = makeRepo();
    r.commitFile("app/page.tsx", "export default 1;\n", "feat: code");
    expect(r.run({ env: { VERCEL: "1", VERCEL_ENV: "preview" } })).toBe(0);
  });

  it("VERCEL_ENV=development skips", () => {
    const r = makeRepo();
    r.commitFile("app/page.tsx", "export default 2;\n", "feat: code");
    expect(r.run({ env: { VERCEL: "1", VERCEL_ENV: "development" } })).toBe(0);
  });

  it("VERCEL_ENV unset builds (fail-safe: a non-Vercel invocation is not a quota event)", () => {
    const r = makeRepo();
    r.commitFile("app/page.tsx", "export default 3;\n", "feat: code");
    expect(r.run({ env: {} })).toBe(1);
  });
});

describe("Z1 — production diff base: VERCEL_GIT_PREVIOUS_SHA (multi-commit pushes)", () => {
  it("a push of [code, docs] with PREVIOUS_SHA at the pre-push tip BUILDS (HEAD^ diff would wrongly skip)", () => {
    const r = makeRepo();
    const before = r.rev("HEAD");
    r.commitFile("app/page.tsx", "export default 4;\n", "feat: code change");
    r.commitFile("docs/note.md", "docs only last\n", "docs: last commit is docs-only");
    expect(
      r.run({ env: { ...PROD, VERCEL_GIT_PREVIOUS_SHA: before } }),
    ).toBe(1); // must build — the RANGE contains code
  });

  it("a push whose whole range is docs-only with PREVIOUS_SHA set SKIPS", () => {
    const r = makeRepo();
    const before = r.rev("HEAD");
    r.commitFile("docs/a.md", "a\n", "docs: a");
    r.commitFile("docs/b.md", "b\n", "docs: b");
    expect(
      r.run({ env: { ...PROD, VERCEL_GIT_PREVIOUS_SHA: before } }),
    ).toBe(0);
  });

  it("an UNREACHABLE PREVIOUS_SHA (force-push target) fails safe to HEAD^ logic and builds on code", () => {
    const r = makeRepo();
    r.commitFile("app/page.tsx", "export default 5;\n", "feat: code");
    expect(
      r.run({ env: { ...PROD, VERCEL_GIT_PREVIOUS_SHA: "ffffffffffffffffffffffffffffffffffffffff" } }),
    ).toBe(1);
  });

  it("no PREVIOUS_SHA falls back to HEAD^ (single docs commit skips)", () => {
    const r = makeRepo();
    r.commitFile("docs/only.md", "docs\n", "docs: only docs");
    expect(r.run({ env: PROD })).toBe(0);
  });
});

describe("Z1 — production diff scope", () => {
  it("a merge commit carrying code changes BUILDS even when PREVIOUS_SHA is the pre-merge main tip", () => {
    const r = makeRepo();
    const mainTip = r.rev("HEAD");
    r.checkoutBranch("feature", mainTip);
    r.commitFile("app/new.tsx", "export default 6;\n", "feat: branch code");
    r.checkoutBranch("main", mainTip);
    r.mergeNoFF("feature", "Merge feature");
    expect(
      r.run({ env: { ...PROD, VERCEL_GIT_PREVIOUS_SHA: mainTip } }),
    ).toBe(1);
  });

  it("artifacts/** evidence files do NOT trigger a production build", () => {
    const r = makeRepo();
    r.commitFile("artifacts/phase6/T59.json", "{}\n", "chore: evidence artifact");
    expect(r.run({ env: PROD })).toBe(0);
  });

  it("mixed artifacts + code change still BUILDS", () => {
    const r = makeRepo();
    r.commitFile("artifacts/phase6/T59.json", "{}\n", "chore: artifact");
    r.commitFile("lib/x.ts", "export const x = 1;\n", "feat: code");
    expect(r.run({ env: PROD })).toBe(1);
  });

  it("docs/** and scripts/ci/** remain in the skip scope (X1 regression guard)", () => {
    const r = makeRepo();
    r.commitFile("docs/guide.md", "guide\n", "docs: guide");
    r.commitFile("scripts/ci/helper.sh", "#!/bin/sh\n", "chore(ci): helper");
    expect(r.run({ env: PROD })).toBe(0);
  });
});
