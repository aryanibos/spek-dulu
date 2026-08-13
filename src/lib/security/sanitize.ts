export function sanitizeExportHeading(value: string): string {
  return value.replace(/[\r\n\0\u2028\u2029]/g, " ").trim();
}

export function sanitizeExportFilename(value: string): string {
  const cleaned = sanitizeExportHeading(value)
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/^\.+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 100) || "spekdulu-export";
}

export function sanitizeYamlScalar(value: string): string {
  const cleaned = value.replace(/[\r\n\0\u2028\u2029]/g, " ").trim();
  return `"${cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const DANGEROUS_URL_SCHEME = /^(?:javascript|data|vbscript|file|blob):/i;
const DANGEROUS_INLINE_LINK =
  /(!?\[[^\]]*\])\(\s*((?:javascript|data|vbscript|file|blob):(?:[^()]|\([^)]*\))*)\s*\)/gi;

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

const NAMED_URL_ENTITY: Record<string, string> = {
  colon: ":",
  Colon: ":",
};

function decodeUrlEntities(url: string): string {
  return url
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_URL_ENTITY[name] ?? match)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number.parseInt(num, 10)));
}

function normalizeUrlForSchemeCheck(url: string): string {
  let normalized = decodeUrlEntities(url)
    .replace(ZERO_WIDTH_CHARS, "")
    .replace(/[\0\r]/g, "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "");

  for (let round = 0; round < 4; round++) {
    try {
      const decoded = decodeURIComponent(normalized)
        .replace(ZERO_WIDTH_CHARS, "")
        .replace(/[\0\r]/g, "")
        .replace(/\s+/g, "");
      if (decoded === normalized) break;
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized;
}

function hasDangerousUrlScheme(url: string): boolean {
  return DANGEROUS_URL_SCHEME.test(normalizeUrlForSchemeCheck(url));
}

function sanitizeStyleAttributeValue(value: string): string {
  return value.replace(/url\s*\(\s*([^)]+)\s*\)/gi, (match, url: string) =>
    hasDangerousUrlScheme(url) ? "url(#blocked-scheme)" : match,
  );
}

const DANGEROUS_HTML_TAGS =
  "iframe|object|embed|svg|meta|link|style|base|body|video|audio|form";

export function stripDangerousMarkdown(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(new RegExp(`<(${DANGEROUS_HTML_TAGS})[\\s\\S]*?>[\\s\\S]*?<\\/\\1>`, "gi"), "")
    .replace(new RegExp(`<(${DANGEROUS_HTML_TAGS}|input|img|script|style)[^>]*>`, "gi"), "")
    .replace(
      /<((?:javascript|data|vbscript|file|blob):[^>\s]*)>/gi,
      "<#blocked-scheme>",
    )
    .replace(/(^|[\s/>])on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")
    .replace(DANGEROUS_INLINE_LINK, "$1(#blocked-scheme)")
    .replace(
      /(!?\[[^\]]*\])\(([^)]+)\)/g,
      (match, prefix: string, url: string) =>
        hasDangerousUrlScheme(url) ? `${prefix}(#blocked-scheme)` : match,
    )
    .replace(
      /^(\s*\[[^\]]+\]:\s*)(.+)$/gm,
      (match, prefix: string, url: string) =>
        hasDangerousUrlScheme(url) ? `${prefix}#blocked-scheme` : match,
    )
    .replace(
      /(\s(?:href|src)\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, attrPrefix: string, _quoted?: string, dbl?: string, sng?: string, bare?: string) => {
        const url = dbl ?? sng ?? bare ?? "";
        return hasDangerousUrlScheme(url) ? `${attrPrefix}"#blocked-scheme"` : match;
      },
    )
    .replace(
      /(\sstyle\s*=\s*)("([^"]*)"|'([^']*)')/gi,
      (match, attrPrefix: string, _quoted?: string, dbl?: string, sng?: string) => {
        const styleValue = dbl ?? sng ?? "";
        const sanitized = sanitizeStyleAttributeValue(styleValue);
        if (sanitized === styleValue) {
          return match;
        }
        const quote = dbl !== undefined ? '"' : "'";
        return `${attrPrefix}${quote}${sanitized}${quote}`;
      },
    );
}

export function looksLikePlaceholder(content: string): boolean {
  return /TODO|TBD|lorem ipsum|\[insert|xxx+/i.test(content);
}
