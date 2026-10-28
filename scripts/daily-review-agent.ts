#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const expected = "aryanibos/spek-dulu";
if (process.env.GITHUB_REPOSITORY !== expected) {
  throw new Error(`Refusing to run for ${process.env.GITHUB_REPOSITORY ?? "unknown repository"}`);
}

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const until = new Date().toISOString();
const raw = execFileSync("gh", [
  "api", "--paginate",
  "-H", "Accept: application/vnd.github+json",
  `repos/${expected}/commits?sha=main&since=${since}&until=${until}&per_page=100`,
], { encoding: "utf8" });

// gh --paginate emits one JSON array per page. Deduplicate by SHA because the
// API may return repeated boundary entries across page/window races.
const commits = raw.trim().split("\n").filter(Boolean).flatMap((page) => JSON.parse(page));
const shas = new Set(commits.map((commit: { sha: string }) => commit.sha));
const count = shas.size;
console.log(JSON.stringify({ repository: expected, since, until, contributions: count }));
if (count < 20 || count > 30) {
  console.log("Outside inclusive trigger band (20–30); review skipped.");
  process.exit(0);
}

// This repository exposes deterministic checks in package.json. This initial
// production mode is report-only: it does not invent source edits or bypass
// branch protection. Publish a PR only after a separately reviewed patch exists.
for (const task of ["lint", "typecheck", "test", "build"]) {
  console.log(`Running npm run ${task}`);
  execFileSync("npm", ["run", task], { stdio: "inherit" });
}
console.log("Eligible window reviewed; deterministic checks passed. No safe patch was generated, so nothing was pushed.");
