import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix = "spd") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export async function readJsonResponse<T extends Record<string, unknown>>(
  res: Response,
  fallbackError: string,
): Promise<T> {
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    if (!res.ok) throw new Error(fallbackError);
    throw new Error(`${fallbackError} (invalid JSON)`);
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error ? data.error : fallbackError,
    );
  }
  return data as T;
}
