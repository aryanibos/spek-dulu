import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/claude-auto-commit.yml", "utf8");

describe("claude auto-commit workflow", () => {
  it("bills Claude through the repository API secret", () => {
    expect(workflow).toContain("anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}");
    expect(workflow).not.toMatch(/sk-ant-/);
  });

  it("checks the daily main quota before calling Claude", () => {
    const quota = workflow.indexOf("Stop when the daily main quota is full");
    const claude = workflow.indexOf("Debug and code-review one fix with Claude");
    expect(quota).toBeGreaterThan(-1);
    expect(claude).toBeGreaterThan(quota);
    expect(workflow).toContain('if: steps.quota.outputs.allowed == \'true\' && steps.existing.outputs.open == \'false\'');
    expect(workflow).toContain("MAIN_DAILY_COMMIT_LIMIT: \"5\"");
  });

  it("keeps the five Jakarta daytime runs and squash-merges onto main", () => {
    expect(workflow).toContain('cron: "0 1,4,7,10,13 * * *"');
    expect(workflow).toContain("COMMIT_LIMIT_TZ: Asia/Jakarta");
    expect(workflow).toContain("gh pr merge");
    expect(workflow).toContain("--squash");
    expect(workflow).toContain("cursor/claude-auto-");
  });

  it("refuses to publish changes that weaken the commit limit", () => {
    expect(workflow).toContain("daily-main-commit-limit.ts");
    expect(workflow).toContain("claude-auto-commit.yml");
    expect(workflow).toContain(".githooks/pre-push");
    expect(workflow).toContain("Refusing to publish changes");
  });
});
