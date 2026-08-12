#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  countCommitsToday,
  DEFAULT_COMMIT_LIMIT_TIMEZONE,
  DEFAULT_MAIN_DAILY_COMMIT_LIMIT,
  evaluateDailyMainCommitLimit,
  findBackdatedCommits,
  findFutureDatedCommits,
  isDailyMainCommitQuotaExhausted,
  type CommitTimestamp,
} from "../src/lib/git/daily-main-commit-limit.ts";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const GIT_SHA_RE = /^[0-9a-f]{40}$/i;
const SAFE_GIT_REF_RE = /^[\w./-]+$/;

function runGit(args: string[], encoding?: "buffer" | null): Buffer;
function runGit(args: string[], encoding: "utf8"): string;
function runGit(args: string[], encoding: "utf8" | "buffer" | null = "utf8"): string | Buffer {
  return execFileSync("git", args, {
    encoding,
    stdio: encoding === null ? ["ignore", "ignore", "ignore"] : ["ignore", "pipe", "pipe"],
  });
}

function assertSafeGitRef(value: string, label: string): string {
  if (
    value === ZERO_SHA ||
    GIT_SHA_RE.test(value) ||
    SAFE_GIT_REF_RE.test(value)
  ) {
    return value;
  }
  throw new Error(`Invalid ${label}: "${value}"`);
}

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
      runGit(["rev-parse", "--verify", `${candidate}^{commit}`], null);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Cannot resolve git ref for branch "${branch}"`);
}

function readCommitTimestamps(ref: string): CommitTimestamp[] {
  const output = runGit(["log", ref, "--first-parent", "--format=%cI"]);

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function readCommitTimestampsInRange(base: string, tip: string): CommitTimestamp[] {
  const output = runGit([
    "log",
    `${assertSafeGitRef(base, "GIT_PUSH_BASE")}..${assertSafeGitRef(tip, "GIT_PUSH_TIP")}`,
    "--first-parent",
    "--format=%cI",
  ]);

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function assertValidCommitDates(commits: CommitTimestamp[], timezone: string) {
  const backdated = findBackdatedCommits(commits, timezone);
  if (backdated.length > 0) {
    throw new Error(
      `Backdated committer dates are not allowed (${backdated.length} commit(s) before today in ${timezone}).`,
    );
  }

  const futureDated = findFutureDatedCommits(commits, timezone);
  if (futureDated.length > 0) {
    throw new Error(
      `Future-dated committer dates are not allowed (${futureDated.length} commit(s) after today in ${timezone}).`,
    );
  }
}

function readCommitTimestampsFromTip(tip: string, count: number): CommitTimestamp[] {
  const limit = Number.isFinite(count) && count > 0 ? count : 1;
  const output = runGit([
    "log",
    assertSafeGitRef(tip, "GIT_PUSH_TIP"),
    "--first-parent",
    "-n",
    String(limit),
    "--format=%cI",
  ]);

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((iso) => ({ committedAt: new Date(iso) }));
}

function readZeroBasePushCommits(): CommitTimestamp[] {
  const pushTip = process.env.GIT_PUSH_TIP;
  if (!pushTip) {
    return [];
  }

  const pushBase = process.env.GIT_PUSH_BASE;
  if (pushBase && pushBase !== ZERO_SHA) {
    return [];
  }

  const rawCount = process.env.GIT_PUSH_COMMIT_COUNT ?? "1";
  const count = Number.parseInt(rawCount, 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(
      `GIT_PUSH_COMMIT_COUNT must be a positive integer, got "${rawCount}"`,
    );
  }

  return readCommitTimestampsFromTip(pushTip, count);
}

function readPushRangeCommits(): CommitTimestamp[] {
  const pushTip = process.env.GIT_PUSH_TIP;
  if (!pushTip) {
    return [];
  }

  const pushBase = process.env.GIT_PUSH_BASE;
  // Zero/empty base (new branch, force-push recreate) — range unknown; caller
  // falls back to zero-base tip validation instead of full history.
  if (!pushBase || pushBase === ZERO_SHA) {
    return [];
  }
  return readCommitTimestampsInRange(pushBase, pushTip);
}

function readPendingMainCommits(timezone: string) {
  if (process.env.PENDING_MAIN_COMMITS !== undefined) {
    const raw = process.env.PENDING_MAIN_COMMITS;
    const pending = Number.parseInt(raw, 10);
    if (!Number.isFinite(pending) || pending < 0) {
      throw new Error(
        `PENDING_MAIN_COMMITS must be a non-negative integer, got "${raw}"`,
      );
    }
    return pending;
  }

  const commits = readPushRangeCommits();
  if (commits.length > 0) {
    assertValidCommitDates(commits, timezone);
    return commits.length;
  }

  return 0;
}

function validateRetrospectiveCommitDates(
  commits: CommitTimestamp[],
  timezone: string,
) {
  const pushCommits = readPushRangeCommits();
  if (pushCommits.length > 0) {
    assertValidCommitDates(pushCommits, timezone);
    return;
  }

  const zeroBaseCommits = readZeroBasePushCommits();
  if (zeroBaseCommits.length > 0) {
    assertValidCommitDates(zeroBaseCommits, timezone);
    return;
  }

  if (commits.length > 0) {
    assertValidCommitDates([commits[0]!], timezone);
  }
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

  if (process.env.RETROSPECTIVE_CHECK === "1") {
    validateRetrospectiveCommitDates(commits, timezone);
  }

  const commitsToday = countCommitsToday(commits, timezone);
  const pendingCommits = readPendingMainCommits(timezone);
  const result = evaluateDailyMainCommitLimit({
    commitsToday,
    limit,
    timezone,
    pendingCommits,
    retrospective: process.env.RETROSPECTIVE_CHECK === "1",
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
