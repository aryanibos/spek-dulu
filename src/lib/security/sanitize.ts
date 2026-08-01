export function stripDangerousMarkdown(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\b(?:javascript|data|vbscript):/gi, "");
}

export function looksLikePlaceholder(content: string): boolean {
  return /TODO|TBD|lorem ipsum|\[insert|\bxxx+\b/i.test(content);
}
