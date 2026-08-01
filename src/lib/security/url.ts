import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 120_000;

function normalizeIp(ip: string): string {
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) return lower.slice(7);
  return lower;
}

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0" || normalized === "::")
    return true;
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80"))
    return true;
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
  if (net.isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw new Error("Private IP addresses are blocked.");
  }

  try {
    const records = await lookup(url.hostname, { all: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("URL resolves to a private network address.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("private")) throw error;
    throw new Error("Unable to resolve host safely.");
  }

  return url;
}

export async function fetchSafePublicHtml(rawUrl: string): Promise<string> {
  let url = await assertSafePublicUrl(rawUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

      if (!response.ok) throw new Error(`Upstream responded with ${response.status}.`);
      const text = await response.text();
      return text.slice(0, MAX_HTML_BYTES);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
