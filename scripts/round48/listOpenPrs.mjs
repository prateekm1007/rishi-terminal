#!/usr/bin/env node
/**
 * scripts/round48/listOpenPrs.mjs — enumerate open PRs (gh CLI unavailable).
 * Reads the PAT from the rule-37 cache (Article VI: two stores only; this is
 * the sanctioned single-value cache, outside the repo).
 */
import { readFileSync } from "node:fs";

const credLine = readFileSync("/home/z/my-project/.secrets/git-credentials", "utf8").trim();
const m = credLine.match(/^https:\/\/([^:]+):([^@]+)@github\.com$/);
if (!m) {
  console.error("FAIL: git-credentials cache does not match the expected shape");
  process.exit(1);
}
const token = m[2];

const res = await fetch(
  "https://api.github.com/repos/prateekm1007/rishi-terminal/pulls?state=open&per_page=100&sort=created&direction=asc",
  {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "rishi-terminal-ci",
    },
  },
);
const json = await res.json();
if (!res.ok) {
  console.error(`FAIL ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  process.exit(1);
}
for (const pr of json) {
  console.log(
    `#${pr.number}\t${pr.state}\tbase=${pr.base.ref}\thead=${pr.head.ref}@${pr.head.sha.slice(0, 12)}\tmergeable=${pr.mergeable}\tmergeable_state=${pr.mergeable_state}\tdraft=${pr.draft}\t| ${pr.title}`,
  );
}
console.log(`TOTAL OPEN: ${json.length}`);
