export const DEFAULT_MAIN_DAILY_COMMIT_LIMIT = 5;
export const DEFAULT_COMMIT_LIMIT_TIMEZONE = "Asia/Jakarta";

export interface CommitTimestamp {
  committedAt: Date;
}

export interface DailyMainCommitLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  timezone: string;
  resetAt: Date;
  message: string;
}

export function formatDayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function countCommitsOnDay(
  commits: CommitTimestamp[],
  timezone: string,
  dayKey: string,
): number {
  return commits.filter(
    (commit) => formatDayKey(commit.committedAt, timezone) === dayKey,
  ).length;
}

export function countCommitsToday(
  commits: CommitTimestamp[],
  timezone: string,
  now: Date = new Date(),
): number {
  return countCommitsOnDay(commits, timezone, formatDayKey(now, timezone));
}

export function getNextMorningReset(
  timezone: string,
  now: Date = new Date(),
): Date {
  const todayKey = formatDayKey(now, timezone);
  let lo = now.getTime();
  let hi = lo + 36 * 60 * 60 * 1000;

  while (hi - lo > 1_000) {
    const mid = Math.floor((lo + hi) / 2);
    if (formatDayKey(new Date(mid), timezone) === todayKey) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date(hi);
}

export function isDailyMainCommitQuotaExhausted(
  commitsToday: number,
  limit: number = DEFAULT_MAIN_DAILY_COMMIT_LIMIT,
): boolean {
  return commitsToday >= limit;
}

export function evaluateDailyMainCommitLimit(options: {
  commitsToday: number;
  limit?: number;
  timezone?: string;
  now?: Date;
  pendingCommits?: number;
}): DailyMainCommitLimitResult {
  const limit = options.limit ?? DEFAULT_MAIN_DAILY_COMMIT_LIMIT;
  const timezone = options.timezone ?? DEFAULT_COMMIT_LIMIT_TIMEZONE;
  const now = options.now ?? new Date();
  const pendingCommits = options.pendingCommits ?? 0;
  const totalAfterPending = options.commitsToday + pendingCommits;
  const allowed = totalAfterPending <= limit;
  const remaining = Math.max(0, limit - options.commitsToday);
  const remainingAfterPending = Math.max(0, limit - totalAfterPending);
  const resetAt = getNextMorningReset(timezone, now);
  const resetLabel = resetAt.toLocaleString("id-ID", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const slotsLabel =
    pendingCommits > 0 ? remainingAfterPending : remaining;

  const message = allowed
    ? `${options.commitsToday}/${limit} commit ke main hari ini. Sisa ${slotsLabel}.`
    : `Batas ${limit} commit/hari ke branch main sudah tercapai (${totalAfterPending}/${limit}). Lanjutkan besok pagi (reset ${resetLabel}).`;

  return {
    allowed,
    count: options.commitsToday,
    limit,
    remaining,
    timezone,
    resetAt,
    message,
  };
}
