#!/usr/bin/env node
/**
 * scripts/round47/openPr.mjs — open the P0-8 PR via the GitHub API
 * (gh CLI unavailable in this environment). Reads the PAT from the
 * rule-37 cache (single-value, outside the repo). Body verified intact
 * post-create (the P0-3 precedent).
 * Usage: node scripts/round47/openPr.mjs <head-branch> <title-file> <body-file>
 */
import { readFileSync } from "node:fs";

const [head, titleFile, bodyFile] = process.argv.slice(2);
if (!head || !titleFile || !bodyFile) {
  console.error("usage: node scripts/round47/openPr.mjs <head-branch> <title-file> <body-file>");
  process.exit(1);
}
const credLine = readFileSync("/home/z/my-project/.secrets/git-credentials", "utf8").trim();
const m = credLine.match(/^https:\/\/([^:]+):([^@]+)@github\.com$/);
if (!m) {
  console.error("FAIL: git-credentials cache does not match the expected shape");
  process.exit(1);
}
const [, , token] = m;
const title = readFileSync(titleFile, "utf8").trim();
const body = readFileSync(bodyFile, "utf8");

const res = await fetch("https://api.github.com/repos/prateekm1007/rishi-terminal/pulls", {
  method: "POST",
  headers: {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "rishi-terminal-ci",
  },
  body: JSON.stringify({ title, head, base: "main", body, maintainer_can_modify: false }),
});
const json = await res.json();
if (!res.ok) {
  console.error(`FAIL ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  process.exit(1);
}
console.log(`OPENED #${json.number} ${json.html_url}`);

// verify the body landed intact
const check = await fetch(`https://api.github.com/repos/prateekm1007/rishi-terminal/pulls/${json.number}`, {
  headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "rishi-terminal-ci" },
});
const cj = await check.json();
const intact = cj.body === body;
console.log(`BODY-INTACT: ${intact}`);
if (!intact) process.exit(1);
