import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const DEFAULT_MAX_BYTES = 120_000;
const DEFAULT_MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8_000;

/** Node URL.hostname keeps brackets for IPv6 literals. */
export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function mappedIpv4FromV6(normalizedIp: string): string | null {
  if (!normalizedIp.startsWith("::ffff:")) return null;
  const mapped = normalizedIp.slice("::ffff:".length);
  if (net.isIP(mapped) === 4) return mapped;

  // Node may rewrite ::ffff:127.0.0.1 as ::ffff:7f00:1
  const hexMatch = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hexMatch) return null;
  const hi = Number.parseInt(hexMatch[1], 16);
  const lo = Number.parseInt(hexMatch[2], 16);
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

/** Exported for unit tests and shared fetch helpers. */
export function isPrivateIp(ip: string): boolean {
  const normalized = normalizeHostname(ip);

  const mappedIpv4 = mappedIpv4FromV6(normalized);
  if (mappedIpv4) return isPrivateIp(mappedIpv4);

  if (normalized === "0.0.0.0" || normalized === "::1" || normalized === "::") {
    return true;
  }

  // Loopback 127.0.0.0/8
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;

  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;

  // CGNAT 100.64.0.0/10
  const cgnat = normalized.match(/^100\.(\d+)\./);
  if (cgnat) {
    const second = Number(cgnat[1]);
    if (second >= 64 && second <= 127) return true;
  }

  // IPv6 ULA (fc00::/7) and link-local (fe80::/10)
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

  const host = normalizeHostname(url.hostname);
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error("Local or internal hosts are blocked.");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("Private IP addresses are blocked.");
  }

  try {
    const records = await lookup(host, { all: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("URL resolves to a private network address.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("private")) throw error;
    throw new Error("Unable to resolve host safely.");
  }

  return url;
}

export async function assertSafeRedirectTarget(current: URL, location: string): Promise<URL> {
  let next: URL;
  try {
    next = new URL(location, current);
  } catch {
    throw new Error("Invalid redirect Location.");
  }
  return assertSafePublicUrl(next.toString());
}

export async function readResponseTextWithCap(
  response: Response,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Upstream response exceeds ${maxBytes} byte limit.`);
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new Error(`Upstream response exceeds ${maxBytes} byte limit.`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Upstream response exceeds ${maxBytes} byte limit.`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export async function fetchSafePublicText(
  url: URL,
  options?: { maxBytes?: number; maxRedirects?: number },
): Promise<string> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let current = await assertSafePublicUrl(url.toString());

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SpekDuluBot/1.0 (+https://spekdulu.local)",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect missing Location header.");
        current = await assertSafeRedirectTarget(current, location);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upstream responded with ${response.status}.`);
      }

      return await readResponseTextWithCap(response, maxBytes);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
