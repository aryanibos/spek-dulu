import { describe, expect, it } from "vitest";
import { looksLikePlaceholder, stripDangerousMarkdown } from "@/lib/security/sanitize";

describe("sanitize", () => {
  it("strips script tags and event handlers", () => {
    const input =
      '<script>alert(1)</script><img src=x onerror=alert(1) /><a href="javascript:alert(1)">x</a>';
    const cleaned = stripDangerousMarkdown(input);
    expect(cleaned).not.toMatch(/<script/i);
    expect(cleaned).not.toMatch(/onerror/i);
    expect(cleaned).not.toMatch(/javascript:/i);
  });

  it("does not treat ordinary words like maximum as placeholders", () => {
    expect(looksLikePlaceholder("Set the maximum value")).toBe(false);
    expect(looksLikePlaceholder("TODO: fill this in")).toBe(true);
    expect(looksLikePlaceholder("Replace xxx later")).toBe(true);
  });
});
