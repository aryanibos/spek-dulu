export function sanitizeExportHeading(value: string): string {
  return value.replace(/[\r\n\0]/g, " ").trim();
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
  const cleaned = value.replace(/[\r\n]/g, " ").trim();
  return `"${cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const DANGEROUS_URL_SCHEME = /^(?:javascript|data|vbscript|file|blob):/i;

function hasDangerousUrlScheme(url: string): boolean {
  const normalized = url.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
  return DANGEROUS_URL_SCHEME.test(normalized);
}

const DANGEROUS_HTML_TAGS =
  "iframe|object|embed|svg|meta|link|style|base|body|video|audio|form";

export function stripDangerousMarkdown(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(new RegExp(`<(${DANGEROUS_HTML_TAGS})[\\s\\S]*?>[\\s\\S]*?<\\/\\1>`, "gi"), "")
    .replace(new RegExp(`<(${DANGEROUS_HTML_TAGS}|input|img|script|style)[^>]*>`, "gi"), "")
    .replace(/(^|[\s/>])on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")
    .replace(/javascript:/gi, "")
    .replace(
      /(!?\[[^\]]*\])\(([^)]+)\)/g,
      (match, prefix: string, url: string) =>
        hasDangerousUrlScheme(url) ? `${prefix}(#blocked-scheme)` : match,
    )
    .replace(
      /(\s(?:href|src)\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, attrPrefix: string, _quoted?: string, dbl?: string, sng?: string, bare?: string) => {
        const url = dbl ?? sng ?? bare ?? "";
        return hasDangerousUrlScheme(url) ? `${attrPrefix}"#blocked-scheme"` : match;
      },
    );
}

export function looksLikePlaceholder(content: string): boolean {
  return /TODO|TBD|lorem ipsum|\[insert|xxx+/i.test(content);
}
