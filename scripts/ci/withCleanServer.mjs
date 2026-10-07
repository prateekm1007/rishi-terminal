#!/usr/bin/env node
// scripts/ci/withCleanServer.mjs — audit item E2 (2026-10-05): make clean
// test environments AUTOMATIC, not remembered.
//
// The incident class this kills (both bit this project for real):
//   1. `pkill -f "next start"` misses the server — the process renames
//      itself to `next-server` after start, so a zombie survived and a
//      later run tested the WRONG (stale) build, producing false local
//      fail-first evidence that had to be retracted.
//   2. `.next/cache` survives `next build`, so a rebuild can serve stale
//      chunks from the old build unless the whole directory is removed.
//   3. `reuseExistingServer: true` (Playwright's webServer default here)
//      silently adopted whatever zombie held port 3000.
//
// Contract — before the wrapped command runs, IN ORDER, each step logged:
//   [clean-server] 1. port <PORT> ownership: free | next-server(stale) | UNKNOWN
//        - free            -> proceed
//        - identifiable next-server / `next start` process -> KILLED
//          (SIGTERM, 8 s, then SIGKILL), port re-verified free, proceed
//        - anything unidentifiable -> FAIL LOUDLY (exit 3) with the
//          PID + cmdline. We never kill a process we cannot recognize.
//   [clean-server] 2. rm -rf .next               (whole tree, cache included)
//   [clean-server] 3. npm run build               (fresh; failure aborts)
//   [clean-server] 4. spawn ONE `npm run start`   (own process group, PID logged)
//   [clean-server] 5. health-check the --health path (default /api/version)
//   [clean-server] 6. run the wrapped command; forward its exit code
//   [clean-server] 7. teardown: kill the process group. A server that died
//                   mid-run is reported loudly and turns a zero exit into 4.
//
// Usage:
//   node scripts/ci/withCleanServer.mjs [--port 3000] [--health /api/version]
//        [--env KEY=VALUE]... -- <command> [args...]
//
// Example (the sanctioned way to run a local browser fail-first battery):
//   node scripts/ci/withCleanServer.mjs --env RANKINGS_ENABLED=true -- \
//        npx playwright test test/e2e/i18n.spec.ts
//
// Exit codes: 0 = wrapped command exited 0; 1.. = wrapped command's code;
// 3 = unrecognized port holder (refused to proceed); 4 = environment error
// (build failed, server never became healthy, server died mid-run, port
// never freed, port ownership UNDETERMINABLE — ss missing AND the
// /proc/net/tcp fallback cannot read the kernel tables); 5 = usage error.

import { spawn, spawnSync } from "node:child_process";
import { rmSync, existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";

const log = (...a) => console.log(`[clean-server ${new Date().toISOString()}]`, ...a);

// ── port ownership (pure parts exported for the vitest suite) ─────────
/** Classify a port-holder description {pids:[{pid,name,cmdline}]}:
 *  free | next-server (ours to kill) | unknown (refuse).
 *  A holder with NO readable pid is NEVER free-by-ignorance — it is
 *  refused (unknown), because we cannot know what we would be killing. */
export function classifyHolder(desc) {
  const holders = (desc.pids || []).filter((p) =>
    p.pid === null || p.pid === undefined ? true : Number(p.pid) !== process.pid,
  );
  if (!holders.length) return { kind: "free" };
  for (const p of holders) {
    const c = (p.cmdline || "").toLowerCase();
    const n = (p.name || "").toLowerCase();
    const isNextServer =
      c.includes("next-server") ||
      c.includes("next start") ||
      /\bnext\b[^|]*\bstart\b/.test(c) ||
      n.includes("next-server") ||
      (n === "node" && c.includes("next"));
    if (!isNextServer) return { kind: "unknown", holders };
  }
  return { kind: "next-server", holders };
}

/** Parse `ss -ltnp` output lines for pid/name pairs on the target port. */
export function parseSsListeners(stdout) {
  const pids = [];
  for (const line of String(stdout).split("\n").slice(1)) {
    if (!/LISTEN/.test(line)) continue;
    const pidMatches = line.match(/pid=(\d+)/g) || [];
    const nameMatch = line.match(/users:\(\("([^"]*)"/);
    for (const one of pidMatches) {
      const pid = Number(one.slice(4));
      let cmdline = "";
      try {
        cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ");
      } catch {
        /* unreadable (other user) — name only */
      }
      pids.push({ pid, name: nameMatch ? nameMatch[1] : "", cmdline });
    }
    if (!pidMatches.length && nameMatch) {
      // listener visible without a pid: another user's process
      pids.push({ pid: null, name: nameMatch[1], cmdline: "" });
    }
  }
  return pids;
}

// ── G6 (founder Round-22, 2026-10-07): the deterministic port-ownership
// chain is ss → /proc/net/tcp{6}. The previous chain silently fell back to
// lsof and, when BOTH tools were missing, returned [] — which
// classifyHolder reads as "free". A blind free verdict is fail-OPEN: the
// exact incident class (testing the wrong build / a zombie's port) this
// harness exists to kill. The kernel tables are always present on Linux
// (the only platform this harness supports), so the fallback is
// deterministic: parse the LISTEN inodes for the port, map each inode to
// its owning pid through /proc/<pid>/fd, and refuse on anything that
// cannot be attributed (hidden holder), exactly like the ss path.

/** Pure: parse /proc/net/tcp or /proc/net/tcp6 content and return the
 *  socket inodes LISTENING on portNum (st = 0A, local port hex match).
 *  Malformed lines are skipped, never guessed into inodes. */
export function parseProcNetListeners(procNetText, portNum) {
  const wantHex = Number(portNum).toString(16).toUpperCase().padStart(4, "0");
  const inodes = [];
  for (const line of String(procNetText).split("\n").slice(1)) {
    const cols = line.trim().split(/\s+/);
    // sl, local, rem, st, tx:rx, tr:tm->when, retrnsmt, uid, timeout, inode, ...
    if (cols.length < 10) continue;
    if (cols[3] !== "0A") continue; // TCP_LISTEN only
    const localPortHex = (cols[1].split(":")[1] || "").toUpperCase();
    if (localPortHex !== wantHex) continue;
    const inode = cols[9];
    if (!/^\d+$/.test(inode)) continue;
    inodes.push(inode);
  }
  return inodes;
}

/** Map socket inodes to owning pids by scanning <procRoot>/<pid>/fd/*
 *  links (socket:[inode]). Injectable fs for tests. An inode NO pid can
 *  claim (another user in a hardened environment, vanished process) is
 *  surfaced as a HIDDEN holder — classifyHolder refuses those — never
 *  dropped, because dropping it would turn an attributable port into a
 *  blind "free". */
export function pidsForSocketInodes(inodes, opts = {}) {
  const procRoot = opts.procRoot || "/proc";
  const listPids = opts.listPids || (() => {
    try {
      return readdirSync(procRoot).filter((d) => /^\d+$/.test(d));
    } catch {
      return [];
    }
  });
  const readlink = opts.readlink || ((p) => readlinkSync(p));
  const readFile = opts.readFile || ((p) => readFileSync(p, "utf8"));
  const wanted = new Set(inodes);
  const found = new Map(); // inode -> {pid, name, cmdline}
  for (const dir of listPids()) {
    const pid = Number(dir);
    const fdDir = `${procRoot}/${dir}/fd`;
    let fds = [];
    try {
      fds = readdirSync(fdDir);
    } catch {
      continue; // unreadable (other user / vanished) — other pids may still map
    }
    for (const fd of fds) {
      let link = "";
      try {
        link = readlink(`${fdDir}/${fd}`);
      } catch {
        continue;
      }
      const m = /^socket:\[(\d+)\]$/.exec(link);
      if (!m || !wanted.has(m[1]) || found.has(m[1])) continue;
      let name = "";
      let cmdline = "";
      try {
        name = readFile(`${procRoot}/${dir}/comm`).trim();
      } catch {}
      try {
        cmdline = readFile(`${procRoot}/${dir}/cmdline`).replace(/\0/g, " ").trim();
      } catch {}
      found.set(m[1], { pid, name, cmdline });
    }
  }
  const pids = [];
  for (const inode of inodes) {
    if (found.has(inode)) pids.push(found.get(inode));
    else
      pids.push({
        pid: null,
        name: `(socket inode ${inode} — pid not visible)`,
        cmdline: "",
      });
  }
  return pids;
}

/** Read /proc/net/tcp (+ tcp6) and resolve the port's LISTEN holders.
 *  Returns { kind: "pids", pids } or { kind: "unavailable", reason } —
 *  the latter ONLY when the kernel tables themselves are unreadable (no
 *  /proc, hardened mount), i.e. when even the fallback cannot safely
 *  establish port state. Injectable readers for tests. */
export function portOwnershipViaProc(portNum, opts = {}) {
  const readProcNet = opts.readProcNet || ((file) => readFileSync(file, "utf8"));
  const inodes = [];
  const unreadable = [];
  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    try {
      inodes.push(...parseProcNetListeners(readProcNet(file), portNum));
    } catch (e) {
      unreadable.push(`${file}: ${e.code || e.message}`);
    }
  }
  if (inodes.length === 0 && unreadable.length === 2) {
    return { kind: "unavailable", reason: unreadable.join(", ") };
  }
  if (inodes.length === 0) return { kind: "pids", pids: [] };
  return { kind: "pids", pids: pidsForSocketInodes(inodes, opts) };
}

/** The clear English failure for an unresolvable port state (exit 4). */
export function procUnavailableMessage(portNum, reason) {
  return (
    `[clean-server] FAIL: cannot establish port ${portNum} ownership — ` +
    `ss is unavailable and the /proc/net/tcp fallback cannot read the kernel ` +
    `tables (${reason}). Refusing to guess: the run would not be trustworthy (exit 4).`
  );
}

function listeningPids(portNum) {
  const trySs = spawnSync("ss", ["-ltnp", `sport = :${portNum}`], { encoding: "utf8" });
  if (!trySs.error && trySs.status === 0) {
    // ss RAN CLEAN — its verdict is trusted outright.
    const fromSs = parseSsListeners(trySs.stdout || "");
    if (fromSs.length) return fromSs;
    if (/LISTEN/.test(trySs.stdout || "")) {
      // ss showed a LISTEN socket but no pid/name at all (not even hidden-name)
      return [{ pid: null, name: "(no pid visible)", cmdline: "" }];
    }
    return []; // genuinely free per ss
  }
  const why =
    trySs.error?.code === "ENOENT"
      ? "not available in this environment"
      : `failed to run (spawn error: ${trySs.error?.code || trySs.error?.message || "unknown"}${trySs.status != null ? `, exit ${trySs.status}` : ""})`;
  log(`ss is ${why} — using the deterministic /proc/net/tcp fallback for port ownership`);
  const via = portOwnershipViaProc(portNum);
  if (via.kind === "unavailable") {
    console.error(procUnavailableMessage(portNum, via.reason));
    process.exit(4);
  }
  return via.pids;
}

function portIsFree(portNum) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(portNum, "127.0.0.1");
  });
}

async function waitFor(fn, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function ensurePortFree(port) {
  const pids = listeningPids(port);
  const verdict = classifyHolder({ pids });
  if (verdict.kind === "free") {
    log(`1. port ${port}: free`);
    return;
  }
  if (verdict.kind === "unknown") {
    for (const h of verdict.holders) {
      console.error(`[clean-server] FAIL: port ${port} is held by an UNRECOGNIZED process — refusing to kill it:`);
      console.error(`  pid=${h.pid ?? "?"} name=${h.name ?? "?"} cmdline=${h.cmdline || "(unreadable)"}`);
    }
    console.error(`  Identify and stop it yourself, or pass --port to use another port.`);
    process.exit(3);
  }
  for (const h of verdict.holders) {
    log(`1. port ${port}: STALE next-server pid=${h.pid} (${h.name}) — killing`);
    try {
      process.kill(Number(h.pid), "SIGTERM");
    } catch (e) {
      console.error(`  SIGTERM failed: ${e.message}`);
    }
  }
  if (await waitFor(() => portIsFree(port), 8000)) {
    log(`   port ${port} freed after SIGTERM`);
    return;
  }
  for (const h of verdict.holders) {
    try {
      process.kill(Number(h.pid), "SIGKILL");
    } catch {}
  }
  if (await waitFor(() => portIsFree(port), 5000)) {
    log(`   SIGKILL required; port ${port} now free`);
    return;
  }
  console.error(`[clean-server] FAIL: could not free port ${port} (exit 4)`);
  process.exit(4);
}

async function healthCheck(port, healthPath) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${healthPath}`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// ── main (guarded: importing this module for its pure exports must not
// run the harness — same pattern as deployCadence.mjs) ───────────────────

/** Parse CLI args. Exported for tests. */
export function parseArgs(argv) {
  let port = 3000;
  let healthPath = "/api/version";
  const envExtra = {};
  const cmdIdx = argv.indexOf("--");
  if (cmdIdx === -1) {
    return { error: "usage: withCleanServer.mjs [--port N] [--env K=V]... -- <command>" };
  }
  for (let i = 0; i < cmdIdx; i++) {
    if (argv[i] === "--port") port = Number(argv[++i]);
    else if (argv[i] === "--health") healthPath = argv[++i];
    else if (argv[i] === "--env") {
      const [k, ...rest] = String(argv[++i]).split("=");
      envExtra[k] = rest.join("=");
    } else {
      return { error: `unknown argument '${argv[i]}'` };
    }
  }
  const command = argv.slice(cmdIdx + 1);
  if (command.length === 0) return { error: "no wrapped command after '--'" };
  return { port, healthPath, envExtra, command };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    console.error(`withCleanServer: ${args.error}`);
    process.exit(5);
  }
  const { port, healthPath, envExtra, command } = args;

await ensurePortFree(port);

if (existsSync(".next")) {
  log(`2. removing stale build artifacts (.next, cache included)`);
  rmSync(".next", { recursive: true, force: true });
} else {
  log(`2. no stale .next present`);
}

log(`3. building fresh (npm run build)`);
// E2S fix (2026-10-06, found via the SR rename verification): --env values
// must reach the BUILD too, not only the server. CI sets env vars like
// RANKINGS_ENABLED at the JOB level, so its `npm run build` bakes them
// into the ISR prerender ("the homepage prerender bakes the rankings
// state — ISR serves that prerender on the first hit", ci.yml). A harness
// whose --env skips the build produced a prerender that DISAGREED with
// CI's — the exact stale-build false-failure class this harness exists
// to kill (the SR smoke run failed locally on the ranked banner while CI
// was green, because the local build had baked the disabled state).
const buildEnv = { ...process.env, ...envExtra };
for (const [k, v] of Object.entries(envExtra)) log(`   build env: ${k}=${v}`);
const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", env: buildEnv });
if (build.status !== 0) {
  console.error(`[clean-server] FAIL: build exited ${build.status} (exit 4)`);
  process.exit(4);
}

let wrappedDone = false;
let serverDiedMidRun = false;

log(`4. starting exactly one server (npm run start, own process group)`);
const server = spawn("npm", ["run", "start"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, ...envExtra, PORT: String(port) },
  detached: true,
});
server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on("data", (d) => process.stderr.write(`[server:err] ${d}`));
server.on("exit", (code, signal) => {
  if (!wrappedDone) {
    serverDiedMidRun = true;
    console.error(`[clean-server] FAIL: server died mid-run (code=${code} signal=${signal})`);
  }
});
log(`   server pid=${server.pid} (process group ${-server.pid})`);

const killServer = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    try {
      process.kill(server.pid, "SIGTERM");
    } catch {}
  }
};
process.on("SIGINT", () => {
  killServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  killServer();
  process.exit(143);
});

log(`5. health-check http://127.0.0.1:${port}${healthPath}`);
const healthy = await healthCheck(port, healthPath);
if (!healthy) {
  killServer();
  console.error(`[clean-server] FAIL: server never answered ${healthPath} within 90 s (exit 4)`);
  process.exit(4);
}
log(`   healthy: ${JSON.stringify(healthy).slice(0, 140)}`);

log(`6. running: ${command.join(" ")}`);
const wrapped = spawn(command[0], command.slice(1), { stdio: "inherit", env: process.env });
const wrappedCode = await new Promise((resolve) => {
  wrapped.on("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
});
wrappedDone = true;
log(`6. wrapped command exited ${wrappedCode}`);

killServer();
const serverWent = await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 8000);
  server.on("exit", () => {
    clearTimeout(t);
    resolve(true);
  });
});
if (serverWent) {
  log(`7. teardown: server stopped cleanly`);
} else {
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch {}
  log(`7. teardown: SIGKILL required`);
}

if (wrappedCode === 0 && serverDiedMidRun) {
  console.error(`[clean-server] FAIL: wrapped command exited 0 but the server died mid-run — the run is not trustworthy (exit 4)`);
  process.exit(4);
}
process.exit(wrappedCode);
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (isMain) {
  await main();
}
