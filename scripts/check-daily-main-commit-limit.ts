#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  countCommitsToday,
  DEFAULT_COMMIT_LIMIT_TIMEZONE,
  DEFAULT_MAIN_DAILY_COMMIT_LIMIT,
  evaluateDailyMainCommitLimit,
} from "../src/lib/git/daily-main-commit-limit.ts";

function readMainCommitTimestamps(branch: string) {
  const output = execSync(`git log ${branch} --format=%cI`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function readPendingMainCommits() {
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

  const commits = readMainCommitTimestamps(branch);
  const commitsToday = countCommitsToday(commits, timezone);
  const pendingCommits = readPendingMainCommits();
  const result = evaluateDailyMainCommitLimit({
    commitsToday,
    limit,
    timezone,
    pendingCommits,
  });

  console.log(result.message);
  if (!result.allowed) {
    process.exit(1);
  }
}

main();
