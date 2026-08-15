import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ZERO_SHA = "0000000000000000000000000000000000000000";

function createTodayCommitsOnBase(baseRef: string, commitCount: number): string {
  let parent = execSync(`git rev-parse ${baseRef}^{commit}`, { encoding: "utf8" }).trim();
  const nowIso = execSync("TZ=Asia/Jakarta date -Iseconds", { encoding: "utf8" }).trim();
  const tree = execSync(`git rev-parse ${parent}^{tree}`, { encoding: "utf8" }).trim();

  for (let index = 0; index < commitCount; index += 1) {
    parent = execSync(
      `git commit-tree ${tree} -p ${parent} -m "commit-limit script test tip ${index + 1}"`,
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: nowIso,
          GIT_COMMITTER_DATE: nowIso,
        },
      },
    ).trim();
  }

  const ref = `refs/heads/test-commit-limit-${commitCount}-${parent.slice(0, 8)}`;
  execSync(`git update-ref ${ref} ${parent}`);
  return ref;
}

function createTodayTipRef(commitCount = 1): string {
  return createTodayCommitsOnBase("HEAD", commitCount);
}

function runCommitLimitCheck(env: Record<string, string>): {
  status: number;
  output: string;
} {
  try {
    const output = execSync("npm run --silent check:main-commit-limit", {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output: output.trim() };
  } catch (error) {
    const execError = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      status: execError.status ?? 1,
      output: [execError.stdout, execError.stderr, execError.message]
        .filter(Boolean)
        .join("\n"),
    };
  }
}

describe("check-daily-main-commit-limit script", () => {
  let todayTipRef = "HEAD";
  let todayMultiTipRef = "HEAD";
  let originalHead = "";
  let preTodayBase = "";

  beforeAll(() => {
    originalHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    preTodayBase = execSync("git rev-parse e1020c0", { encoding: "utf8" }).trim();
    todayTipRef = createTodayCommitsOnBase(preTodayBase, 1);
    todayMultiTipRef = createTodayCommitsOnBase(preTodayBase, 2);
  });

  afterAll(() => {
    execSync("git for-each-ref --format='%(refname)' refs/heads/test-commit-limit- | xargs -r -n1 git update-ref -d", {
      stdio: "ignore",
      shell: "/bin/bash",
    });
    if (originalHead) {
      execSync(`git checkout ${originalHead}`, { stdio: "ignore" });
    }
  });

  it("does not scan full history when GIT_PUSH_BASE is zero on retrospective check", () => {
    const result = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      GIT_PUSH_TIP: todayTipRef,
      GIT_PUSH_BASE: ZERO_SHA,
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain("/5 commit ke main hari ini");
    expect(result.output).not.toContain("Backdated committer dates");
  });

  it("exits 1 when STOP_WHEN_AT_LIMIT and quota is exhausted", () => {
    const fiveTodayRef = createTodayCommitsOnBase(preTodayBase, 5);

    const result = runCommitLimitCheck({
      GIT_BRANCH: fiveTodayRef,
      STOP_WHEN_AT_LIMIT: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain("5/5");
  });

  it("allows STOP_WHEN_AT_LIMIT at exactly quota on retrospective check", () => {
    const fiveTodayRef = createTodayCommitsOnBase(preTodayBase, 5);

    const result = runCommitLimitCheck({
      GIT_BRANCH: fiveTodayRef,
      GIT_PUSH_TIP: fiveTodayRef,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "1",
      STOP_WHEN_AT_LIMIT: "1",
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain("5/5");
  });

  it("validates multiple commits on zero-base retrospective push", () => {
    const result = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      GIT_PUSH_TIP: todayMultiTipRef,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "2",
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain("/5 commit ke main hari ini");
  });

  it("counts zero-base push commits toward pending quota without PENDING_MAIN_COMMITS", () => {
    const fourTodayRef = createTodayCommitsOnBase(preTodayBase, 4);
    const twoCommitTipRef = createTodayCommitsOnBase(preTodayBase, 2);

    const blocked = runCommitLimitCheck({
      GIT_BRANCH: fourTodayRef,
      GIT_PUSH_TIP: twoCommitTipRef,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "2",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });
    expect(blocked.status).toBe(1);
    expect(blocked.output).toContain("6/5");

    const atQuota = runCommitLimitCheck({
      GIT_BRANCH: fourTodayRef,
      GIT_PUSH_TIP: todayTipRef,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });
    expect(atQuota.status).toBe(0);
    expect(atQuota.output).toContain("Sisa 0");
  });

  it("rejects backdated commits on zero-base push when count matches push size", () => {
    const yesterdayIso = execSync("TZ=Asia/Jakarta date -Iseconds -d 'yesterday'", {
      encoding: "utf8",
    }).trim();
    let parent = execSync(`git rev-parse ${preTodayBase}^{commit}`, {
      encoding: "utf8",
    }).trim();
    const tree = execSync(`git rev-parse ${parent}^{tree}`, { encoding: "utf8" }).trim();

    parent = execSync(
      `git commit-tree ${tree} -p ${parent} -m "commit-limit backdated push commit"`,
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: yesterdayIso,
          GIT_COMMITTER_DATE: yesterdayIso,
        },
      },
    ).trim();

    const nowIso = execSync("TZ=Asia/Jakarta date -Iseconds", { encoding: "utf8" }).trim();
    const tip = execSync(
      `git commit-tree ${tree} -p ${parent} -m "commit-limit today push commit"`,
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: nowIso,
          GIT_COMMITTER_DATE: nowIso,
        },
      },
    ).trim();

    const onlyTip = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      GIT_PUSH_TIP: tip,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "1",
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });
    expect(onlyTip.status).toBe(0);

    const bothCommits = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      GIT_PUSH_TIP: tip,
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "2",
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });
    expect(bothCommits.status).not.toBe(0);
    expect(bothCommits.output).toContain("Backdated committer dates");
  });

  it("rejects shell metacharacters in GIT_PUSH_TIP", () => {
    const result = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      GIT_PUSH_TIP: "deadbeef; rm -rf /",
      GIT_PUSH_BASE: ZERO_SHA,
      GIT_PUSH_COMMIT_COUNT: "1",
      RETROSPECTIVE_CHECK: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Invalid GIT_PUSH_TIP");
  });

  it("rejects shell metacharacters in GIT_BRANCH", () => {
    const result = runCommitLimitCheck({
      GIT_BRANCH: "-n^{commit}",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "5",
    });

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Invalid GIT_BRANCH");
  });
});
