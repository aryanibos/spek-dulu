export function stripDangerousMarkdown(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function looksLikePlaceholder(content: string): boolean {
  return /TODO|TBD|lorem ipsum|\[insert|xxx+/i.test(content);
}
