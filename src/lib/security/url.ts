import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 120_000;

function stripIpv6Brackets(ip: string): string {
  return ip.replace(/^\[/, "").replace(/\]$/, "");
}

function normalizeIp(ip: string): string {
  const stripped = stripIpv6Brackets(ip);
  const lower = stripped.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const tail = stripped.slice(7);
    if (net.isIP(tail) === 4) return tail;
    const parts = tail.split(":");
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16);
      const lo = parseInt(parts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      }
    }
  }
  return stripped;
}

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (normalized === "0.0.0.0") return true;
  if (normalized === "127.0.0.1" || normalized === "::1") return true;
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (normalized.startsWith("100.64.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  ) {
    return true;
  }
  return false;
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are blocked.");
  }
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Local or internal hosts are blocked.");
  }

  const hostname = stripIpv6Brackets(url.hostname);
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Private IP addresses are blocked.");
  }

  try {
    const records = await lookup(hostname, { all: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("URL resolves to a private network address.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("private")) throw error;
    throw new Error("Unable to resolve host safely.");
  }

  return url;
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let result = "";
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      const keep = value.byteLength - (total - maxBytes);
      result += decoder.decode(value.slice(0, keep), { stream: true });
      break;
    }
    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();
  return result;
}

export async function fetchSafePublicHtml(rawUrl: string): Promise<string> {
  let url = await assertSafePublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SpekDuluBot/1.0 (+https://spekdulu.local)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect missing Location header.");
        url = await assertSafePublicUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upstream responded with ${response.status}.`);
      }

      return readLimitedText(response, MAX_BODY_BYTES);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
