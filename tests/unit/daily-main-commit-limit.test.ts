import { describe, expect, it } from "vitest";
import {
  countCommitsToday,
  evaluateDailyMainCommitLimit,
  formatDayKey,
  getNextMorningReset,
} from "@/lib/git/daily-main-commit-limit";

describe("daily main commit limit", () => {
  it("counts commits by calendar day in the configured timezone", () => {
    const commits = [
      { committedAt: new Date("2026-08-01T16:00:00.000Z") },
      { committedAt: new Date("2026-08-01T23:30:00.000Z") },
      { committedAt: new Date("2026-07-31T20:00:00.000Z") },
    ];

    expect(
      countCommitsToday(
        commits,
        "Asia/Jakarta",
        new Date("2026-08-01T12:00:00.000Z"),
      ),
    ).toBe(2);
  });

  it("allows commits while under the daily limit", () => {
    const result = evaluateDailyMainCommitLimit({
      commitsToday: 3,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.message).toContain("3/5");
  });

  it("blocks commits once the daily limit is reached", () => {
    const result = evaluateDailyMainCommitLimit({
      commitsToday: 5,
      pendingCommits: 1,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("besok pagi");
  });

  it("reports zero remaining slots when already at the limit", () => {
    const result = evaluateDailyMainCommitLimit({
      commitsToday: 5,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("includes pending commits when checking before push", () => {
    const result = evaluateDailyMainCommitLimit({
      commitsToday: 5,
      pendingCommits: 1,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(result.allowed).toBe(false);
  });

  it("computes the next reset at the following local midnight", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const resetAt = getNextMorningReset("Asia/Jakarta", now);

    expect(formatDayKey(resetAt, "Asia/Jakarta")).toBe("2026-08-02");
    expect(resetAt.getTime()).toBeGreaterThan(now.getTime());
  });
});
