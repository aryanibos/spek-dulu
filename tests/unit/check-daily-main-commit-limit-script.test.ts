import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ZERO_SHA = "0000000000000000000000000000000000000000";

function createTodayTipRef(commitCount = 1): string {
  const ref = "refs/heads/test-commit-limit-tip";
  const nowIso = execSync("TZ=Asia/Jakarta date -Iseconds", { encoding: "utf8" }).trim();
  for (let index = 0; index < commitCount; index += 1) {
    execSync(`git commit --allow-empty -m "commit-limit script test tip ${index + 1}"`, {
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: nowIso,
        GIT_COMMITTER_DATE: nowIso,
      },
    });
  }
  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  execSync(`git update-ref ${ref} ${sha}`);
  return ref;
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

  beforeAll(() => {
    originalHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    todayTipRef = createTodayTipRef(1);
    todayMultiTipRef = createTodayTipRef(2);
  });

  afterAll(() => {
    execSync("git update-ref -d refs/heads/test-commit-limit-tip", { stdio: "ignore" });
    if (originalHead) {
      execSync(`git reset --hard ${originalHead}`, { stdio: "ignore" });
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
    const result = runCommitLimitCheck({
      GIT_BRANCH: "origin/main",
      STOP_WHEN_AT_LIMIT: "1",
      COMMIT_LIMIT_TZ: "Asia/Jakarta",
      MAIN_DAILY_COMMIT_LIMIT: "0",
    });

    expect(result.status).toBe(1);
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
});
