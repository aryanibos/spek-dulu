import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 120_000;

function normalizeIp(rawIp: string): string {
  let ip = rawIp.trim();
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.slice(1, -1);
  }
  const mapped = ip.toLowerCase().match(/^::ffff:(.+)$/);
  if (mapped) {
    ip = mapped[1];
  }
  return ip;
}

function isPrivateIp(rawIp: string): boolean {
  const ip = normalizeIp(rawIp);
  if (ip === "0.0.0.0") return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
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

  const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1");
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

async function readLimitedText(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      chunks.push(value.slice(0, value.byteLength - (total - MAX_BODY_BYTES)));
      break;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function fetchSafePublicHtml(rawUrl: string | URL): Promise<string> {
  let current = typeof rawUrl === "string" ? await assertSafePublicUrl(rawUrl) : rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (hop > 0) {
      current = await assertSafePublicUrl(current.toString());
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SpekDuluBot/1.0 (+https://spekdulu.local)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect missing Location header.");
        current = new URL(location, current);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upstream responded with ${response.status}.`);
      }

      return readLimitedText(response.body);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
