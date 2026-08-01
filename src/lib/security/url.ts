import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const MAX_HTML_BYTES = 120_000;
const MAX_REDIRECTS = 5;

function normalizeIp(ip: string): string {
  const stripped = ip.replace(/^\[|\]$/g, "");
  const dottedMapped = stripped.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dottedMapped) return dottedMapped[1];

  const hexMapped = stripped.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1], 16);
    const lo = parseInt(hexMapped[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return stripped;
}

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (normalized.startsWith("127.") || normalized === "::1" || normalized === "0.0.0.0") {
    return true;
  }
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80")) {
    return true;
  }
  const parts = normalized.split(".");
  if (parts.length === 4 && parts[0] === "100") {
    const second = Number(parts[1]);
    if (second >= 64 && second <= 127) return true;
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

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
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

export async function fetchSafePublicHtml(raw: string): Promise<string> {
  let url = await assertSafePublicUrl(raw);

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

      const reader = response.body?.getReader();
      if (!reader) return "";

      const decoder = new TextDecoder();
      let result = "";
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_HTML_BYTES) break;
        result += decoder.decode(value, { stream: true });
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
