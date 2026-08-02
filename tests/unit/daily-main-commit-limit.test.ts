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
    expect(result.message).toContain("6/5");
  });

  it("shows remaining slots after a pending push", () => {
    const result = evaluateDailyMainCommitLimit({
      commitsToday: 4,
      pendingCommits: 1,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(result.allowed).toBe(true);
    expect(result.message).toContain("Sisa 0");
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

  it("validates an incoming push against the pre-push baseline", () => {
    const mainBeforePush = [
      { committedAt: new Date("2026-08-01T10:00:00.000Z") },
      { committedAt: new Date("2026-08-01T11:00:00.000Z") },
      { committedAt: new Date("2026-08-01T12:00:00.000Z") },
      { committedAt: new Date("2026-08-01T13:00:00.000Z") },
      { committedAt: new Date("2026-08-01T14:00:00.000Z") },
    ];
    const incomingPush = [{ committedAt: new Date("2026-08-01T15:00:00.000Z") }];
    const commitsToday = countCommitsToday(
      mainBeforePush,
      "Asia/Jakarta",
      new Date("2026-08-01T12:00:00.000Z"),
    );
    const pendingCommits = countCommitsToday(
      incomingPush,
      "Asia/Jakarta",
      new Date("2026-08-01T12:00:00.000Z"),
    );

    const result = evaluateDailyMainCommitLimit({
      commitsToday,
      pendingCommits,
      limit: 5,
      timezone: "Asia/Jakarta",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(commitsToday).toBe(5);
    expect(pendingCommits).toBe(1);
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("besok pagi");
  });

  it("counts only commits from the configured day when filtering a range", () => {
    const commits = [
      { committedAt: new Date("2026-08-01T10:00:00.000Z") },
      { committedAt: new Date("2026-07-30T10:00:00.000Z") },
    ];

    expect(
      countCommitsToday(
        commits,
        "Asia/Jakarta",
        new Date("2026-08-01T12:00:00.000Z"),
      ),
    ).toBe(1);
  });
});
