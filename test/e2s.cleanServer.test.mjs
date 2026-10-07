/**
 * Audit item E2 (2026-10-05) — the clean-server harness must FAIL LOUDLY,
 * not silently test the wrong build. Rule 24: each gate proven to bite.
 *
 * Unit (pure): classifyHolder / parseSsListeners classification —
 *   - a free port passes;
 *   - a next-server holder (all known spellings, incl. the renamed
 *     `next-server` process that `pkill -f "next start"` misses) is ours
 *     to kill;
 *   - an UNRECOGNIZED holder (python http.server, docker-proxy, anything)
 *     is REFUSED — the harness must never kill what it cannot recognize;
 *   - a holder whose pid is hidden (another user) is refused, not guessed.
 *
 * Subprocess (bite, real processes):
 *   - BITES: a foreign listener on the port -> exit 3 with the refusal
 *     message on stderr (never kills it — the listener is still alive
 *     afterwards, proven by connecting to it);
 *   - BITES: a wrapped failing command forwards its exit code;
 *   - PASSES: with the port free, the full lifecycle runs (clean -> build
 *     -> start -> health -> command -> teardown) and the wrapped command
 *     sees the port LISTENING (the server is up and is OURS).
 *
 * The full lifecycle test is guarded by SKIP_FULL_LIFECYCLE=1 for CI
 * economies (CI's Playwright job already builds and boots the app); the
 * classification and bite tests always run.
 */
import { describe, expect, it } from "vitest";
import {
  classifyHolder,
  parseSsListeners,
  parseProcNetListeners,
  pidsForSocketInodes,
  portOwnershipViaProc,
  procUnavailableMessage,
} from "../scripts/ci/withCleanServer.mjs";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SELF = process.pid;
const HARNESS = new URL("../scripts/ci/withCleanServer.mjs", import.meta.url).pathname;
const PORT = 3997; // never 3000: keeps the subprocess tests hermetic

/** A stub project that satisfies the harness's npm contracts instantly.
 *  NOTE the \\" escapes: the start script's node -e argument is a
 *  DOUBLE-QUOTED shell string, so every inner double quote must reach the
 *  shell as \" — writing plain " here breaks the sh parse and the stub
 *  server silently never listens (found the hard way). */
function stubProject(dir, portNum) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "e2s-stub",
      scripts: {
        build: "node -e 'require(\"fs\").mkdirSync(\".next\",{recursive:true})'",
        start: `node -e "require('http').createServer((q,s)=>{s.setHeader('content-type','application/json');s.end('{\\"sha\\":\\"stub\\"}')}).listen(${portNum},'127.0.0.1')"`,
      },
    }),
  );
}

describe("E2 clean-server — classifyHolder (pure)", () => {
  it("free: no pids -> proceed", () => {
    expect(classifyHolder({ pids: [] }).kind).toBe("free");
  });

  it("free: only this process's own pid -> proceed", () => {
    expect(classifyHolder({ pids: [{ pid: SELF, name: "node", cmdline: "node x" }] }).kind).toBe("free");
  });

  it("next-server: the renamed process (`pkill -f 'next start'` misses it)", () => {
    const v = classifyHolder({ pids: [{ pid: 4242, name: "next-server (v16.0.0)", cmdline: "" }] });
    expect(v.kind).toBe("next-server");
    expect(v.holders[0].pid).toBe(4242);
  });

  it("next-server: `node .../next start` cmdline spelling", () => {
    const v = classifyHolder({
      pids: [{ pid: 4243, name: "node", cmdline: "node /app/node_modules/.bin/next start -p 3000" }],
    });
    expect(v.kind).toBe("next-server");
  });

  it("next-server: npm-wrapped `npm run start` with next in the tree", () => {
    const v = classifyHolder({
      pids: [{ pid: 4244, name: "npm", cmdline: "npm run start" , }],
    });
    // `npm run start` alone is NOT identifiable as a next server —
    // the repo could wrap anything. It must be REFUSED, not killed.
    expect(v.kind).toBe("unknown");
  });

  it("unknown: a foreign server (python http.server) is refused", () => {
    const v = classifyHolder({
      pids: [{ pid: 9999, name: "python3", cmdline: "python3 -m http.server 3000" }],
    });
    expect(v.kind).toBe("unknown");
    expect(v.holders[0].pid).toBe(9999);
  });

  it("unknown: docker-proxy is refused", () => {
    const v = classifyHolder({
      pids: [{ pid: 8888, name: "docker-proxy", cmdline: "/usr/bin/docker-proxy -host-port 3000" }],
    });
    expect(v.kind).toBe("unknown");
  });

  it("unknown: hidden pid (another user's process) is refused, not guessed", () => {
    const v = classifyHolder({ pids: [{ pid: null, name: "(no pid visible)", cmdline: "" }] });
    expect(v.kind).toBe("unknown");
  });

  it("unknown: pid undefined (holder reported without identity) is refused", () => {
    const v = classifyHolder({ pids: [{ pid: undefined, name: "", cmdline: "" }] });
    expect(v.kind).toBe("unknown");
  });
});

describe("E2 clean-server — parseSsListeners (pure)", () => {
  const SS_SAMPLE = [
    "State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process",
    "LISTEN 0      511    127.0.0.1:3000      0.0.0.0:*         users:((\"next-server\",pid=4242,fd=18))",
    "LISTEN 0      511    127.0.0.1:5432      0.0.0.0:*         users:((\"postgres\",pid=77,fd=5))",
  ].join("\n");

  it("extracts pid + process name for the listening socket", () => {
    // /proc/4242/cmdline will not exist in the test environment ->
    // cmdline stays empty, name carries the identification.
    const rows = parseSsListeners(SS_SAMPLE).filter((r) => r.pid === 4242);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("next-server");
  });

  it("ignores non-LISTEN and header lines", () => {
    const rows = parseSsListeners("State\nESTAB 0 0 1.2.3.4:3000 5.6.7.8:444 users:((\"x\",pid=1,fd=3))");
    expect(rows).toHaveLength(0);
  });

  it("a LISTEN line with no pid at all is surfaced as a hidden holder", () => {
    const rows = parseSsListeners(
      "State\nLISTEN 0 511 0.0.0.0:3000 0.0.0.0:* users:((\"(no pid visible)\",pid=,fd=9))",
    );
    // name captured; pid absent -> classifyHolder refuses (unknown)
    expect(rows.some((r) => r.pid === null)).toBe(true);
    expect(classifyHolder({ pids: rows }).kind).toBe("unknown");
  });
});

describe("E2 clean-server — subprocess bites (real processes)", () => {
  it(
    "BITES: a foreign listener on the port -> exit 3, refusal message, listener survives",
    async () => {
      const foreign = spawn("python3", ["-m", "http.server", String(PORT)], {
        stdio: "ignore",
      });
      // wait until it listens
      await new Promise((resolve) => {
        const t = setInterval(async () => {
          try {
            const r = await fetch(`http://127.0.0.1:${PORT}/`);
            if (r.ok) {
              clearInterval(t);
              resolve();
            }
          } catch {}
        }, 200);
        setTimeout(() => {
          clearInterval(t);
          resolve();
        }, 8000);
      });
      try {
        const res = spawnSync(
          "node",
          [HARNESS, "--port", String(PORT), "--", "true"],
          { encoding: "utf8", timeout: 30_000 },
        );
        const out = res.stdout + res.stderr;
        expect(res.status).toBe(3);
        expect(out).toContain("UNRECOGNIZED process");
        // the harness must NOT have killed it (never kill what you don't recognize)
        const still = await fetch(`http://127.0.0.1:${PORT}/`);
        expect(still.ok).toBe(true);
      } finally {
        foreign.kill("SIGKILL");
      }
    },
    45_000,
  );

  it(
    "BITES: a failing wrapped command forwards its exit code",
    () => {
      // Run against the STUB dir (instant build/start) so the bite does not
      // pay for a full repo build; the repo-root lifecycle is exercised by
      // the real harness-driven browser runs (PR body evidence).
      const dir = mkdtempSync(join(tmpdir(), "e2s-bite-"));
      try {
        stubProject(dir, PORT);
        const res = spawnSync(
          "node",
          [HARNESS, "--port", String(PORT), "--health", "/", "--", "node", "-e", "process.exit(7)"],
          { cwd: dir, encoding: "utf8", timeout: 60_000 },
        );
        expect(res.status).toBe(7);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    90_000,
  );
});

describe("E2 clean-server — full lifecycle (SKIP_FULL_LIFECYCLE=1 to skip)", () => {
  it.skipIf(process.env.SKIP_FULL_LIFECYCLE === "1")(
    "PASSES: port free -> clean -> build -> start -> health -> command sees the port listening",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "e2s-"));
      try {
        // A real Next.js build of the repo takes minutes; the lifecycle is
        // exercised with a stub project that obeys the same npm contract
        // (build creates .next, start serves JSON on PORT), proving the
        // harness's ordering, health gate and teardown without a full
        // rebuild. The real build path is exercised by every subsequent
        // harness-driven browser run (the i18n acceptance in the PR body).
        stubProject(dir, PORT);
        const harness = spawnSync(
          "node",
          [HARNESS, "--port", String(PORT), "--health", "/", "--", "node", "-e",
           `fetch("http://127.0.0.1:${PORT}/").then(r=>r.json()).then(b=>{ if(b.sha!=="stub") process.exit(9); }).catch(()=>process.exit(9))`],
          { cwd: dir, encoding: "utf8", timeout: 120_000 },
        );
        expect(harness.status).toBe(0);
        expect(harness.stdout).toContain("[clean-server");
        expect(harness.stdout).toContain("healthy");
        // teardown happened: nothing left on the port
        await new Promise((r) => setTimeout(r, 500));
        const gone = await fetch(`http://127.0.0.1:${PORT}/`).then(() => false).catch(() => true);
        expect(gone).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    180_000,
  );
});

// ── G6 (founder Round-22, 2026-10-07): missing-ss detection + deterministic
// /proc/net/tcp fallback for port ownership. Contract: ss is the primary
// tool; when it is missing or fails the harness says so in clear English and
// falls back to the KERNEL tables (/proc/net/tcp{6} + /proc/*/fd inode
// mapping) — never to an unrelated tool, and never to a silent "free" with
// no evidence. Exit 4 is reserved for the case where even the fallback
// cannot safely establish port state. ─────────────────────────────────────

/** A realistic /proc/net/tcp sample: LISTEN on :3000 (0x0BB8), one ESTAB,
 *  one LISTEN on another port, one malformed line. */
const PROC_TCP_SAMPLE = [
  "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode",
  "   0: 0100007F:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 12345 1 ffffabc000000000 100 0 0 10 0",
  "   1: 0100007F:0BB8 0100007F:88AB 01 00000000:00000000 00:00000000 00000000  1000        0 12399 1 ffffabc000000001 20 4 30 10 -1",
  "   2: 00000000:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000      0        0 23456 1 ffffabc000000002 100 0 0 10 0",
  "   3: garbage line with too few columns",
  "",
].join("\n");

describe("G6 clean-server — parseProcNetListeners (pure)", () => {
  it("extracts the listening socket inode for the target port", () => {
    expect(parseProcNetListeners(PROC_TCP_SAMPLE, 3000)).toEqual(["12345"]);
  });

  it("separates ports: the :1F90 LISTEN (8080) belongs to 8080, not 3000; the ESTAB on :0BB8 is ignored", () => {
    expect(parseProcNetListeners(PROC_TCP_SAMPLE, 8080)).toEqual(["23456"]);
  });

  it("parses the IPv6 table format identically", () => {
    const tcp6 = [
      "  sl  local_address remote_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode",
      "   0: 00000000000000000000000000000000:0BB8 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 34567 2 ffffabc000000003 100 0 0 10 0",
    ].join("\n");
    expect(parseProcNetListeners(tcp6, 3000)).toEqual(["34567"]);
  });

  it("never invents inodes for malformed lines", () => {
    expect(parseProcNetListeners("garbage\n\n0: x y z", 3000)).toEqual([]);
  });
});

describe("G6 clean-server — pidsForSocketInodes (injectable fs)", () => {
  it("maps a socket inode to the owning pid via /proc/<pid>/fd links", () => {
    const root = mkdtempSync(join(tmpdir(), "e2s-proc-"));
    try {
      // fake /proc: <root>/4242/fd/18 -> socket:[12345]; <root>/4242/comm
      mkdirSync(join(root, "4242", "fd"), { recursive: true });
      symlinkSync("socket:[12345]", join(root, "4242", "fd", "18"));
      writeFileSync(join(root, "4242", "comm"), "next-server");
      writeFileSync(join(root, "4242", "cmdline"), "next-server (v16)\0");
      // an unrelated process with a different socket
      mkdirSync(join(root, "777", "fd"), { recursive: true });
      symlinkSync("socket:[99999]", join(root, "777", "fd", "3"));
      writeFileSync(join(root, "777", "comm"), "sshd");

      const pids = pidsForSocketInodes(["12345"], {
        procRoot: root,
        listPids: () => readdirSync(root).filter((d) => /^\d+$/.test(d)),
        readlink: (p) => readlinkSync(p),
        readFile: (p) => readFileSync(p, "utf8"),
      });
      expect(pids).toHaveLength(1);
      expect(pids[0].pid).toBe(4242);
      expect(pids[0].name).toBe("next-server");
      expect(pids[0].cmdline).toContain("next-server");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("an unmapped inode is surfaced as a HIDDEN holder (refuse, never guess)", () => {
    const pids = pidsForSocketInodes(["555555"], {
      procRoot: "/nonexistent-proc-root",
      listPids: () => [],
      readlink: () => {
        throw Object.assign(new Error("nope"), { code: "ENOENT" });
      },
      readFile: () => {
        throw Object.assign(new Error("nope"), { code: "ENOENT" });
      },
    });
    expect(pids).toHaveLength(1);
    expect(pids[0].pid).toBeNull();
    expect(classifyHolder({ pids }).kind).toBe("unknown");
  });
});

describe("G6 clean-server — portOwnershipViaProc decision", () => {
  it("unavailable when BOTH /proc/net/tcp and tcp6 are unreadable -> the exit-4 message", () => {
    const via = portOwnershipViaProc(3000, {
      readProcNet: (file) => {
        throw Object.assign(new Error("missing"), { code: "ENOENT", path: file });
      },
      listPids: () => [],
      readlink: () => {
        throw new Error("unused");
      },
      readFile: () => {
        throw new Error("unused");
      },
    });
    expect(via.kind).toBe("unavailable");
    expect(via.reason).toContain("/proc/net/tcp");
    const msg = procUnavailableMessage(3000, via.reason);
    expect(msg).toContain("exit 4");
    expect(msg).toContain("cannot establish");
  });

  it("free: kernel tables readable and no LISTEN inode on the port", () => {
    const via = portOwnershipViaProc(3000, {
      readProcNet: (file) => (file.endsWith("tcp6") ? "" : PROC_TCP_SAMPLE.replace(":0BB8 ", ":0000 ")),
      listPids: () => [],
      readlink: () => {
        throw new Error("unused");
      },
      readFile: () => {
        throw new Error("unused");
      },
    });
    expect(via.kind).toBe("pids");
    expect(via.pids).toEqual([]);
  });
});

describe("G6 clean-server — subprocess bites with ss AND lsof removed from PATH", () => {
  /** A PATH that contains the shell/node/npm essentials but NOT ss/lsof. */
  function strippedPath() {
    const bin = mkdtempSync(join(tmpdir(), "e2s-path-"));
    for (const tool of ["node", "npm", "sh", "env", "python3"]) {
      try {
        symlinkSync(join("/usr/bin", tool), join(bin, tool));
      } catch {}
    }
    return bin;
  }

  it(
    "BITES: foreign holder with ss missing -> the /proc fallback identifies it -> exit 3 refusal",
    async () => {
      const foreign = spawn("python3", ["-m", "http.server", String(PORT)], { stdio: "ignore" });
      await new Promise((resolve) => {
        const t = setInterval(async () => {
          try {
            const r = await fetch(`http://127.0.0.1:${PORT}/`);
            if (r.ok) { clearInterval(t); resolve(); }
          } catch {}
        }, 200);
        setTimeout(() => { clearInterval(t); resolve(); }, 8000);
      });
      const bin = strippedPath();
      try {
        const res = spawnSync("node", [HARNESS, "--port", String(PORT), "--", "true"], {
          encoding: "utf8",
          timeout: 30_000,
          env: { ...process.env, PATH: bin },
        });
        const out = res.stdout + res.stderr;
        expect(out).toContain("/proc/net/tcp fallback");
        expect(res.status).toBe(3);
        expect(out).toContain("UNRECOGNIZED process");
        const still = await fetch(`http://127.0.0.1:${PORT}/`);
        expect(still.ok).toBe(true);
      } finally {
        foreign.kill("SIGKILL");
        rmSync(bin, { recursive: true, force: true });
      }
    },
    45_000,
  );

  it(
    "PASSES: ss missing + port free -> explicit fallback message, full stub lifecycle still works",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "e2s-g6-"));
      const bin = strippedPath();
      try {
        stubProject(dir, PORT);
        const res = spawnSync(
          "node",
          [HARNESS, "--port", String(PORT), "--health", "/", "--", "node", "-e", "process.exit(0)"],
          { cwd: dir, encoding: "utf8", timeout: 90_000, env: { ...process.env, PATH: bin } },
        );
        const out = res.stdout + res.stderr;
        expect(out).toContain("/proc/net/tcp fallback");
        expect(res.status).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
        rmSync(bin, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
