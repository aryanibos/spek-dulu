#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  countCommitsToday,
  DEFAULT_COMMIT_LIMIT_TIMEZONE,
  DEFAULT_MAIN_DAILY_COMMIT_LIMIT,
  evaluateDailyMainCommitLimit,
  isDailyMainCommitQuotaExhausted,
  type CommitTimestamp,
} from "../src/lib/git/daily-main-commit-limit.ts";

const ZERO_SHA = "0000000000000000000000000000000000000000";

function assertValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`COMMIT_LIMIT_TZ is not a valid IANA timezone: "${timezone}"`);
  }
}

function resolveGitBranchRef(branch: string): string {
  const candidates =
    branch === "main" || branch === "origin/main"
      ? ["origin/main", "main"]
      : [branch, `origin/${branch}`];

  for (const candidate of candidates) {
    try {
      execSync(`git rev-parse --verify ${candidate}^{commit}`, {
        stdio: "ignore",
      });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Cannot resolve git ref for branch "${branch}"`);
}

function readCommitTimestamps(ref: string): CommitTimestamp[] {
  const output = execSync(`git log ${ref} --first-parent --format=%cI`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function readCommitTimestampsInRange(base: string, tip: string): CommitTimestamp[] {
  const output = execSync(`git log ${base}..${tip} --first-parent --format=%cI`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function readPendingMainCommits(timezone: string) {
  const pushTip = process.env.GIT_PUSH_TIP;
  const pushBase = process.env.GIT_PUSH_BASE;

  if (pushTip) {
    const commits =
      !pushBase || pushBase === ZERO_SHA
        ? readCommitTimestamps(pushTip)
        : readCommitTimestampsInRange(pushBase, pushTip);
    return countCommitsToday(commits, timezone);
  }

  const raw = process.env.PENDING_MAIN_COMMITS ?? "0";
  const pending = Number.parseInt(raw, 10);
  if (!Number.isFinite(pending) || pending < 0) {
    throw new Error(
      `PENDING_MAIN_COMMITS must be a non-negative integer, got "${raw}"`,
    );
  }
  return pending;
}

function main() {
  const branch = process.env.GIT_BRANCH ?? "main";
  const timezone = process.env.COMMIT_LIMIT_TZ ?? DEFAULT_COMMIT_LIMIT_TIMEZONE;
  assertValidTimezone(timezone);
  const limit = Number.parseInt(
    process.env.MAIN_DAILY_COMMIT_LIMIT ??
      String(DEFAULT_MAIN_DAILY_COMMIT_LIMIT),
    10,
  );

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(
      `MAIN_DAILY_COMMIT_LIMIT must be a positive integer, got "${process.env.MAIN_DAILY_COMMIT_LIMIT ?? ""}"`,
    );
  }

  const branchRef =
    branch && branch !== ZERO_SHA ? resolveGitBranchRef(branch) : "";
  const commits = branchRef ? readCommitTimestamps(branchRef) : [];
  const commitsToday = countCommitsToday(commits, timezone);
  const pendingCommits = readPendingMainCommits(timezone);
  const result = evaluateDailyMainCommitLimit({
    commitsToday,
    limit,
    timezone,
    pendingCommits,
  });

  console.log(result.message);

  if (
    process.env.STOP_WHEN_AT_LIMIT === "1" &&
    isDailyMainCommitQuotaExhausted(commitsToday, limit)
  ) {
    process.exit(1);
  }

  if (!result.allowed) {
    process.exit(1);
  }
}

main();
