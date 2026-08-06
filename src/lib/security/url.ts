import { lookup } from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
export const MAX_HTML_BYTES = 120_000;
export const MAX_REDIRECTS = 5;

function decodeIpv4MappedHextets(hiHex: string, loHex: string): string {
  const hi = Number.parseInt(hiHex, 16);
  const lo = Number.parseInt(loHex, 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function expandIpv6(ip: string): string[] | null {
  const stripped = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (!stripped.includes(":")) return null;

  const parts = stripped.split("::");
  if (parts.length > 2) return null;

  const head = parts[0] ? parts[0].split(":").filter(Boolean) : [];
  const tail = parts[1] ? parts[1].split(":").filter(Boolean) : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;

  return [...head, ...Array(missing).fill("0"), ...tail];
}

function extract6to4Ipv4(expanded: string[]): string | null {
  if (expanded.length !== 8) return null;
  if (Number.parseInt(expanded[0] ?? "", 16) !== 0x2002) return null;

  const hi = Number.parseInt(expanded[1] ?? "", 16);
  const lo = Number.parseInt(expanded[2] ?? "", 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function extractNat64Ipv4(expanded: string[]): string | null {
  if (expanded.length !== 8) return null;
  if (Number.parseInt(expanded[0] ?? "", 16) !== 0x0064) return null;
  if (Number.parseInt(expanded[1] ?? "", 16) !== 0xff9b) return null;
  if (expanded.slice(2, 6).some((hextet) => Number.parseInt(hextet, 16) !== 0)) {
    return null;
  }

  return decodeIpv4MappedHextets(expanded[6] ?? "", expanded[7] ?? "");
}

function extractEmbeddedIpv4(expanded: string[]): string | null {
  for (const hextet of expanded) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hextet)) {
      return hextet;
    }
  }
  return null;
}

function hasIpv4MappedPrefix(expanded: string[]): boolean {
  return expanded.some((hextet) => Number.parseInt(hextet, 16) === 0xffff);
}

function extractIpv4Mapped(ip: string): string | null {
  const stripped = ip.replace(/^\[|\]$/g, "").toLowerCase();

  const dottedMapped = stripped.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dottedMapped) return dottedMapped[1];

  const hexMapped = stripped.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMapped) return decodeIpv4MappedHextets(hexMapped[1], hexMapped[2]);

  const zeroMapped = stripped.match(/^::ffff:0:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (zeroMapped) return decodeIpv4MappedHextets(zeroMapped[1], zeroMapped[2]);

  const expanded = expandIpv6(stripped);
  if (!expanded || expanded.length !== 8) return null;

  const sixToFour = extract6to4Ipv4(expanded);
  if (sixToFour) return sixToFour;

  const nat64 = extractNat64Ipv4(expanded);
  if (nat64) return nat64;

  const embedded = extractEmbeddedIpv4(expanded);
  if (embedded && hasIpv4MappedPrefix(expanded)) return embedded;

  if (hasIpv4MappedPrefix(expanded)) {
    const tailMapped = decodeIpv4MappedHextets(
      expanded[6] ?? "",
      expanded[7] ?? "",
    );
    if (tailMapped !== "0.0.0.0") return tailMapped;
  }

  const prefixZero = expanded.slice(0, 5).every((hextet) => Number.parseInt(hextet, 16) === 0);
  if (!prefixZero || Number.parseInt(expanded[5] ?? "", 16) !== 0xffff) return null;

  return decodeIpv4MappedHextets(expanded[6] ?? "", expanded[7] ?? "");
}

function normalizeIp(ip: string): string {
  const mapped = extractIpv4Mapped(ip);
  if (mapped) return mapped;
  return ip.replace(/^\[|\]$/g, "").toLowerCase();
}

function isLinkLocalHextet(hextet: string): boolean {
  const value = Number.parseInt(hextet, 16);
  if (!Number.isFinite(value)) return false;
  // fe80::/10 — link-local (fe80 through febf)
  return value >= 0xfe80 && value <= 0xfebf;
}

function isSiteLocalHextet(hextet: string): boolean {
  const value = Number.parseInt(hextet, 16);
  if (!Number.isFinite(value)) return false;
  // fec0::/10 — deprecated site-local (fec0 through feff)
  return value >= 0xfec0 && value <= 0xfeff;
}

function isLinkLocalIpv6(ip: string): boolean {
  const expanded = expandIpv6(ip);
  if (!expanded || expanded.length !== 8) return false;

  if (isLinkLocalHextet(expanded[0] ?? "")) return true;

  // Catch compressed forms like ::fe80:1 that embed link-local hextets after ::.
  const leadingZeros = expanded.findIndex((hextet) => Number.parseInt(hextet, 16) !== 0);
  if (leadingZeros < 0) return false;
  return expanded.slice(leadingZeros).some((hextet) => isLinkLocalHextet(hextet));
}

function isSiteLocalIpv6(ip: string): boolean {
  const expanded = expandIpv6(ip);
  if (!expanded || expanded.length !== 8) return false;

  if (isSiteLocalHextet(expanded[0] ?? "")) return true;

  const leadingZeros = expanded.findIndex((hextet) => Number.parseInt(hextet, 16) !== 0);
  if (leadingZeros < 0) return false;
  return expanded.slice(leadingZeros).some((hextet) => isSiteLocalHextet(hextet));
}

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (
    normalized.startsWith("127.") ||
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "::0"
  ) {
    return true;
  }
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    isLinkLocalIpv6(normalized) ||
    isSiteLocalIpv6(normalized)
  ) {
    return true;
  }
  const parts = normalized.split(".");
  if (parts.length === 4) {
    const first = Number(parts[0]);
    if (first === 0) return true;
    if (first === 100) {
      const second = Number(parts[1]);
      if (second >= 64 && second <= 127) return true;
    }
  }
  return false;
}

function parsePublicUrl(raw: string): URL {
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

  return url;
}

export async function resolveSafePublicAddress(hostname: string): Promise<string> {
  const stripped = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(stripped)) {
    if (isPrivateIp(stripped)) {
      throw new Error("Private IP addresses are blocked.");
    }
    return stripped;
  }

  try {
    const records = await lookup(stripped, { all: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error("URL resolves to a private network address.");
    }
    const firstPublic = records.find((record) => !isPrivateIp(record.address));
    if (!firstPublic) {
      throw new Error("URL resolves to a private network address.");
    }
    return firstPublic.address;
  } catch (error) {
    if (error instanceof Error && error.message.includes("private")) throw error;
    throw new Error("Unable to resolve host safely.");
  }
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  const url = parsePublicUrl(raw);
  await resolveSafePublicAddress(url.hostname);
  return url;
}

async function fetchPinnedUrl(
  url: URL,
  pinnedAddress: string,
  signal: AbortSignal,
) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const isHttps = url.protocol === "https:";
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
  const connectHost =
    net.isIP(pinnedAddress) === 6 ? `[${pinnedAddress}]` : pinnedAddress;

  const agent = new Agent({
    connect: {
      host: connectHost,
      port,
      servername: hostname,
    },
  });

  try {
    return await undiciFetch(url.toString(), {
      redirect: "manual",
      signal,
      dispatcher: agent,
      headers: {
        "User-Agent": "SpekDuluBot/1.0 (+https://spekdulu.local)",
      },
    });
  } finally {
    await agent.close();
  }
}

export async function fetchSafePublicHtml(raw: string): Promise<string> {
  let url = await assertSafePublicUrl(raw);

  for (let hop = 0; ; hop++) {
    url = await assertSafePublicUrl(url.toString());
    const pinnedAddress = await resolveSafePublicAddress(url.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchPinnedUrl(url, pinnedAddress, controller.signal);

      if (response.status >= 300 && response.status < 400) {
        if (hop >= MAX_REDIRECTS) {
          throw new Error("Too many redirects.");
        }
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect missing Location header.");
        await response.body?.cancel();
        url = await assertSafePublicUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
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
        if (bytes > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error("Response body exceeds limit.");
        }
        result += decoder.decode(value, { stream: true });
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}
